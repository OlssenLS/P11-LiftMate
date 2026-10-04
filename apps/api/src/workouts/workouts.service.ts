import { Injectable, NotFoundException } from '@nestjs/common';
import {
  computeVolume,
  countWorkingSets,
  roundTo,
  type CreateWorkoutInput,
  type UpdateWorkoutInput,
  type UpsertWorkoutExerciseInput,
  type UpsertWorkoutSetInput,
  type Workout,
  type WorkoutSummary,
  type MetricSet,
} from '@liftmate/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

/** Prisma include that pulls a workout's exercises (with their exercise) and sets. */
const workoutInclude = {
  exercises: {
    where: { deletedAt: null },
    orderBy: { position: 'asc' },
    include: {
      exercise: true,
      sets: {
        where: { deletedAt: null },
        orderBy: { position: 'asc' },
      },
    },
  },
} satisfies Prisma.WorkoutInclude;

type WorkoutRow = Prisma.WorkoutGetPayload<{ include: typeof workoutInclude }>;

/** Map a Prisma workout row (with includes) to the shared `Workout` read model. */
function toWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    note: row.note,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    exercises: row.exercises.map((we) => ({
      id: we.id,
      workoutId: we.workoutId,
      exerciseId: we.exerciseId,
      position: we.position,
      createdAt: we.createdAt,
      updatedAt: we.updatedAt,
      deletedAt: we.deletedAt,
      exercise: we.exercise
        ? {
            id: we.exercise.id,
            name: we.exercise.name,
            primaryMuscle: we.exercise.primaryMuscle,
            secondaryMuscles: we.exercise.secondaryMuscles,
            equipment: we.exercise.equipment,
            movementPattern: we.exercise.movementPattern,
            difficulty: we.exercise.difficulty,
            instructions: we.exercise.instructions,
            externalId: we.exercise.externalId,
          }
        : undefined,
      sets: we.sets.map((s) => ({
        id: s.id,
        workoutExerciseId: s.workoutExerciseId,
        position: s.position,
        setType: s.setType,
        weight: Number(s.weight),
        weightUnit: s.weightUnit,
        reps: s.reps,
        rir: s.rir,
        completed: s.completed,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        deletedAt: s.deletedAt,
      })),
    })),
  };
}

/** Flatten a workout's sets into the minimal shape the metrics helpers need. */
function metricSetsOf(workout: Workout): MetricSet[] {
  return workout.exercises.flatMap((we) =>
    we.sets.map((s) => ({ setType: s.setType, weight: s.weight, reps: s.reps, completed: s.completed })),
  );
}

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a workout with its (optional) nested exercises and sets in one
   * transaction. Accepts client-generated UUIDs so an offline draft syncs
   * without id collisions; re-sending the same ids is idempotent via upsert.
   */
  async create(userId: string, input: CreateWorkoutInput): Promise<Workout> {
    await this.prisma.$transaction(async (tx) => {
      await tx.workout.upsert({
        where: { id: input.id },
        create: {
          id: input.id,
          userId,
          name: input.name ?? null,
          note: input.note ?? null,
          startedAt: input.startedAt,
          completedAt: input.completedAt ?? null,
        },
        update: {
          name: input.name ?? null,
          note: input.note ?? null,
          startedAt: input.startedAt,
          completedAt: input.completedAt ?? null,
        },
      });

      for (const we of input.exercises) {
        await tx.workoutExercise.upsert({
          where: { id: we.id },
          create: {
            id: we.id,
            workoutId: input.id,
            exerciseId: we.exerciseId,
            position: we.position,
          },
          update: { exerciseId: we.exerciseId, position: we.position, deletedAt: null },
        });
        for (const set of we.sets) {
          await tx.workoutSet.upsert({
            where: { id: set.id },
            create: {
              id: set.id,
              workoutExerciseId: we.id,
              position: set.position,
              setType: set.setType,
              weight: set.weight,
              weightUnit: set.weightUnit,
              reps: set.reps,
              rir: set.rir ?? null,
              completed: set.completed,
            },
            update: {
              position: set.position,
              setType: set.setType,
              weight: set.weight,
              weightUnit: set.weightUnit,
              reps: set.reps,
              rir: set.rir ?? null,
              completed: set.completed,
              deletedAt: null,
            },
          });
        }
      }
    });

    return this.getById(userId, input.id);
  }

  /** List the user's non-deleted workouts, most recent first. */
  async list(userId: string, limit = 50, offset = 0): Promise<Workout[]> {
    const rows = await this.prisma.workout.findMany({
      where: { userId, deletedAt: null },
      include: workoutInclude,
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map(toWorkout);
  }

  async getById(userId: string, id: string): Promise<Workout> {
    const row = await this.prisma.workout.findFirst({
      where: { id, userId, deletedAt: null },
      include: workoutInclude,
    });
    if (!row) {
      throw new NotFoundException('Workout not found');
    }
    return toWorkout(row);
  }

  async update(userId: string, id: string, input: UpdateWorkoutInput): Promise<Workout> {
    await this.ensureOwned(userId, id);
    await this.prisma.workout.update({
      where: { id },
      data: {
        name: input.name === undefined ? undefined : input.name,
        note: input.note === undefined ? undefined : input.note,
        completedAt: input.completedAt === undefined ? undefined : input.completedAt,
      },
    });
    return this.getById(userId, id);
  }

  /** Soft-delete a workout (and cascade soft-delete its children). */
  async softDelete(userId: string, id: string): Promise<void> {
    await this.ensureOwned(userId, id);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const exercises = await tx.workoutExercise.findMany({
        where: { workoutId: id },
        select: { id: true },
      });
      const exerciseIds = exercises.map((e) => e.id);
      if (exerciseIds.length > 0) {
        await tx.workoutSet.updateMany({
          where: { workoutExerciseId: { in: exerciseIds } },
          data: { deletedAt: now },
        });
      }
      await tx.workoutExercise.updateMany({ where: { workoutId: id }, data: { deletedAt: now } });
      await tx.workout.update({ where: { id }, data: { deletedAt: now } });
    });
  }

  /** Add or update a single exercise within a workout. */
  async upsertExercise(
    userId: string,
    workoutId: string,
    input: UpsertWorkoutExerciseInput,
  ): Promise<Workout> {
    await this.ensureOwned(userId, workoutId);
    await this.prisma.workoutExercise.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        workoutId,
        exerciseId: input.exerciseId,
        position: input.position,
      },
      update: { exerciseId: input.exerciseId, position: input.position, deletedAt: null },
    });
    return this.getById(userId, workoutId);
  }

  /** Soft-delete a single workout exercise and its sets. */
  async deleteExercise(userId: string, workoutId: string, exerciseRowId: string): Promise<void> {
    await this.ensureOwned(userId, workoutId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.workoutSet.updateMany({
        where: { workoutExerciseId: exerciseRowId },
        data: { deletedAt: now },
      });
      await tx.workoutExercise.update({ where: { id: exerciseRowId }, data: { deletedAt: now } });
    });
  }

  /** Add or update a single set within a workout exercise. */
  async upsertSet(
    userId: string,
    workoutId: string,
    workoutExerciseId: string,
    input: UpsertWorkoutSetInput,
  ): Promise<Workout> {
    await this.ensureOwned(userId, workoutId);
    await this.prisma.workoutSet.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        workoutExerciseId,
        position: input.position,
        setType: input.setType,
        weight: input.weight,
        weightUnit: input.weightUnit,
        reps: input.reps,
        rir: input.rir ?? null,
        completed: input.completed,
      },
      update: {
        position: input.position,
        setType: input.setType,
        weight: input.weight,
        weightUnit: input.weightUnit,
        reps: input.reps,
        rir: input.rir ?? null,
        completed: input.completed,
        deletedAt: null,
      },
    });
    return this.getById(userId, workoutId);
  }

  async deleteSet(userId: string, workoutId: string, setId: string): Promise<void> {
    await this.ensureOwned(userId, workoutId);
    await this.prisma.workoutSet.update({
      where: { id: setId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * The user's most recent *completed* workout that contains the given
   * exercise, excluding `excludeWorkoutId` (the current session). Used to show
   * "previous session" per exercise.
   */
  async previousSession(
    userId: string,
    exerciseId: string,
    excludeWorkoutId?: string,
  ): Promise<Workout | null> {
    const row = await this.prisma.workout.findFirst({
      where: {
        userId,
        deletedAt: null,
        completedAt: { not: null },
        id: excludeWorkoutId ? { not: excludeWorkoutId } : undefined,
        exercises: { some: { exerciseId, deletedAt: null } },
      },
      include: workoutInclude,
      orderBy: { completedAt: 'desc' },
    });
    return row ? toWorkout(row) : null;
  }

  /** Deterministic summary for a completed/active workout (brief §4, §6). */
  async summary(userId: string, id: string): Promise<WorkoutSummary> {
    const workout = await this.getById(userId, id);
    const sets = metricSetsOf(workout);
    const totalVolume = computeVolume(sets, { includeIncomplete: false });

    const durationSeconds = workout.completedAt
      ? Math.max(
          0,
          Math.round((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000),
        )
      : null;

    // Compare against the user's previous completed workout before this one.
    const prev = await this.prisma.workout.findFirst({
      where: {
        userId,
        deletedAt: null,
        completedAt: { not: null },
        id: { not: id },
        startedAt: { lt: workout.startedAt },
      },
      include: workoutInclude,
      orderBy: { startedAt: 'desc' },
    });
    const prevVolume = prev ? computeVolume(metricSetsOf(toWorkout(prev))) : null;

    return {
      id: workout.id,
      name: workout.name,
      startedAt: workout.startedAt,
      completedAt: workout.completedAt,
      durationSeconds,
      exerciseCount: workout.exercises.length,
      totalSets: workout.exercises.reduce((n, we) => n + we.sets.length, 0),
      totalWorkingSets: countWorkingSets(sets, { includeIncomplete: false }),
      totalVolume: roundTo(totalVolume, 1),
      volumeChangeVsPrevious: prevVolume === null ? null : roundTo(totalVolume - prevVolume, 1),
    };
  }

  private async ensureOwned(userId: string, workoutId: string): Promise<void> {
    const found = await this.prisma.workout.findFirst({
      where: { id: workoutId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Workout not found');
    }
  }
}
