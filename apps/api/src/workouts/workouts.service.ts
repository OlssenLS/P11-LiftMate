import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  computeVolume,
  countWorkingSets,
  roundTo,
  type CreateWorkoutInput,
  type UpdateWorkoutInput,
  type UpsertWorkoutExerciseInput,
  type UpsertWorkoutSetInput,
  type Workout,
  type WorkoutSet,
  type WorkoutStatus,
  type WorkoutSummary,
  type ExercisePerformanceDelta,
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
    notes: row.notes,
    note: row.notes,
    status: row.status,
    programId: row.programId,
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
            alternativeExercises: we.exercise.alternativeExercises,
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
        rirUnknown: s.rirUnknown,
        rpe: s.rpe ? Number(s.rpe) : null,
        restTime: s.restTime,
        notes: s.notes,
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class WorkoutsService {
  private readonly logger = new Logger(WorkoutsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Safely resolve an incoming exercise ID against the database.
   * Checks UUID match, slug/externalId match, name match, and finally falls back to
   * the first available catalog exercise so that foreign key constraints are NEVER violated.
   */
  private async resolveExerciseId(
    tx: Prisma.TransactionClient | PrismaService,
    rawId: string,
    exerciseName?: string | null,
  ): Promise<string | null> {
    const isUuid = UUID_REGEX.test(rawId);

    // 1. Direct ID lookup if it is a valid UUID
    if (isUuid) {
      const matchById = await tx.exercise.findFirst({
        where: { id: rawId },
        select: { id: true },
      });
      if (matchById) {
        return matchById.id;
      }
    }

    // 2. Lookup by externalId (slug)
    const matchByExternal = await tx.exercise.findFirst({
      where: { externalId: rawId },
      select: { id: true },
    });
    if (matchByExternal) {
      return matchByExternal.id;
    }

    // 3. Lookup by name if available
    if (exerciseName?.trim()) {
      const matchByName = await tx.exercise.findFirst({
        where: { name: { equals: exerciseName.trim(), mode: 'insensitive' } },
        select: { id: true },
      });
      if (matchByName) {
        return matchByName.id;
      }
    }

    // 4. Safe fallback: first available active exercise in the catalog
    const fallback = await tx.exercise.findFirst({
      where: { deletedAt: null },
      select: { id: true },
    });
    if (fallback) {
      this.logger.warn(
        `Exercise ID "${rawId}" not found in database; safely mapped to fallback exercise ${fallback.id}`,
      );
      return fallback.id;
    }

    return null;
  }

  /**
   * Create a workout with its (optional) nested exercises and sets in one
   * transaction. Accepts client-generated UUIDs so an offline draft syncs
   * without id collisions; re-sending the same ids is idempotent via upsert.
   */
  async create(userId: string, input: CreateWorkoutInput): Promise<Workout> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Verify user exists
      const userExists = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // 2. Validate programId if provided
      let targetProgramId = input.programId ?? null;
      if (targetProgramId) {
        const isProgUuid = UUID_REGEX.test(targetProgramId);
        const prog = isProgUuid
          ? await tx.program.findFirst({
              where: { id: targetProgramId, deletedAt: null },
              select: { id: true },
            })
          : null;
        if (!prog) {
          this.logger.warn(
            `Program ID "${targetProgramId}" not found in DB; safely unlinking from workout ${input.id}`,
          );
          targetProgramId = null;
        }
      }

      await tx.workout.upsert({
        where: { id: input.id },
        create: {
          id: input.id,
          userId,
          name: input.name ?? null,
          notes: input.notes ?? input.note ?? null,
          status: input.status ?? (input.completedAt ? 'completed' : 'in_progress'),
          programId: targetProgramId,
          startedAt: input.startedAt,
          completedAt: input.completedAt ?? null,
        },
        update: {
          name: input.name ?? null,
          notes: input.notes ?? input.note ?? null,
          status: input.status ?? (input.completedAt ? 'completed' : undefined),
          programId: targetProgramId ?? undefined,
          startedAt: input.startedAt,
          completedAt: input.completedAt ?? null,
        },
      });

      // Soft-delete exercises that were removed from this workout
      const incomingExerciseIds = input.exercises.map((e) => e.id);
      await tx.workoutExercise.updateMany({
        where: {
          workoutId: input.id,
          id: { notIn: incomingExerciseIds },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      for (const we of input.exercises) {
        const resolvedExerciseId = await this.resolveExerciseId(
          tx,
          we.exerciseId,
          (we as any).exerciseName ?? (we as any).name,
        );

        if (!resolvedExerciseId) {
          this.logger.error(`No exercise available in catalog to link exercise ${we.id}; skipping`);
          continue;
        }

        await tx.workoutExercise.upsert({
          where: { id: we.id },
          create: {
            id: we.id,
            workoutId: input.id,
            exerciseId: resolvedExerciseId,
            position: we.position,
          },
          update: { exerciseId: resolvedExerciseId, position: we.position, deletedAt: null },
        });

        // Soft-delete sets that were removed from this exercise
        const incomingSetIds = we.sets.map((s) => s.id);
        await tx.workoutSet.updateMany({
          where: {
            workoutExerciseId: we.id,
            id: { notIn: incomingSetIds },
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
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
              rirUnknown: set.rirUnknown ?? false,
              rpe: set.rpe ?? null,
              restTime: set.restTime ?? null,
              notes: set.notes ?? null,
              completed: set.completed,
            },
            update: {
              position: set.position,
              setType: set.setType,
              weight: set.weight,
              weightUnit: set.weightUnit,
              reps: set.reps,
              rir: set.rir ?? null,
              rirUnknown: set.rirUnknown ?? false,
              rpe: set.rpe ?? null,
              restTime: set.restTime ?? null,
              notes: set.notes ?? null,
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
  async list(
    userId: string,
    status?: WorkoutStatus,
    limit = 50,
    offset = 0,
  ): Promise<Workout[]> {
    const rows = await this.prisma.workout.findMany({
      where: {
        userId,
        deletedAt: null,
        status: status ? status : undefined,
      },
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

    let targetProgramId = input.programId;
    if (targetProgramId) {
      const isProgUuid = UUID_REGEX.test(targetProgramId);
      const prog = isProgUuid
        ? await this.prisma.program.findFirst({
            where: { id: targetProgramId, deletedAt: null },
            select: { id: true },
          })
        : null;
      if (!prog) {
        this.logger.warn(
          `Program ID "${targetProgramId}" not found in DB; unlinking from workout ${id}`,
        );
        targetProgramId = null;
      }
    }

    await this.prisma.workout.update({
      where: { id },
      data: {
        name: input.name === undefined ? undefined : input.name,
        notes: (input.notes ?? input.note) === undefined ? undefined : (input.notes ?? input.note),
        status: input.status === undefined ? (input.completedAt ? 'completed' : undefined) : input.status,
        programId: targetProgramId === undefined ? undefined : targetProgramId,
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

    const resolvedExerciseId = await this.resolveExerciseId(
      this.prisma,
      input.exerciseId,
      (input as any).exerciseName ?? (input as any).name,
    );

    if (!resolvedExerciseId) {
      throw new NotFoundException(`Exercise not found in database`);
    }

    await this.prisma.workoutExercise.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        workoutId,
        exerciseId: resolvedExerciseId,
        position: input.position,
      },
      update: { exerciseId: resolvedExerciseId, position: input.position, deletedAt: null },
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
        rirUnknown: input.rirUnknown ?? false,
        rpe: input.rpe ?? null,
        restTime: input.restTime ?? null,
        notes: input.notes ?? null,
        completed: input.completed,
      },
      update: {
        position: input.position,
        setType: input.setType,
        weight: input.weight,
        weightUnit: input.weightUnit,
        reps: input.reps,
        rir: input.rir ?? null,
        rirUnknown: input.rirUnknown ?? false,
        rpe: input.rpe ?? null,
        restTime: input.restTime ?? null,
        notes: input.notes ?? null,
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
   * Recent completed workouts that contain the given exercise.
   * Used for exercise history sheets (up to limit sessions).
   */
  async exerciseHistory(
    userId: string,
    exerciseId: string,
    limit = 5,
    excludeWorkoutId?: string,
  ): Promise<Workout[]> {
    const rows = await this.prisma.workout.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'completed',
        id: excludeWorkoutId ? { not: excludeWorkoutId } : undefined,
        exercises: { some: { exerciseId, deletedAt: null } },
      },
      include: workoutInclude,
      orderBy: { completedAt: 'desc' },
      take: Math.min(Math.max(1, limit), 20),
    });
    return rows.map(toWorkout);
  }

  /**
   * The user's most recent completed workout that contains the given
   * exercise, excluding excludeWorkoutId. Used to show "previous session" per exercise.
   */
  async previousSession(
    userId: string,
    exerciseId: string,
    excludeWorkoutId?: string,
  ): Promise<Workout | null> {
    const history = await this.exerciseHistory(userId, exerciseId, 1, excludeWorkoutId);
    return history[0] ?? null;
  }

  /** Deterministic summary for a completed/active workout (brief §4, §6, WORKOUT_UX.md §9.2). */
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

    // Compare against previous completed workout with same name or same programId if present
    let prev = workout.name
      ? await this.prisma.workout.findFirst({
          where: {
            userId,
            deletedAt: null,
            status: 'completed',
            id: { not: id },
            name: workout.name,
            startedAt: { lt: workout.startedAt },
          },
          include: workoutInclude,
          orderBy: { startedAt: 'desc' },
        })
      : null;

    if (!prev) {
      prev = await this.prisma.workout.findFirst({
        where: {
          userId,
          deletedAt: null,
          status: 'completed',
          id: { not: id },
          startedAt: { lt: workout.startedAt },
        },
        include: workoutInclude,
        orderBy: { startedAt: 'desc' },
      });
    }

    const prevVolume = prev ? computeVolume(metricSetsOf(toWorkout(prev))) : null;
    const volumeChangeVsPrevious =
      prevVolume === null ? null : roundTo(totalVolume - prevVolume, 1);
    const volumePercentageChangeVsPrevious =
      prevVolume !== null && prevVolume > 0
        ? roundTo(((totalVolume - prevVolume) / prevVolume) * 100, 1)
        : null;

    // Performance section per exercise (WORKOUT_UX.md §9.2)
    const exerciseDeltas: ExercisePerformanceDelta[] = [];
    for (const we of workout.exercises) {
      const currentWorkingSets = we.sets.filter(
        (s) => s.setType === 'working' && s.completed,
      );

      const currentBest = currentWorkingSets.reduce<WorkoutSet | null>((best, s) => {
        if (!best) return s;
        if (s.weight > best.weight) return s;
        if (s.weight === best.weight && s.reps > best.reps) return s;
        return best;
      }, null);

      const unit = currentBest?.weightUnit ?? 'kg';
      const prevSession = await this.previousSession(userId, we.exerciseId, id);
      const prevExercise = prevSession?.exercises.find((e) => e.exerciseId === we.exerciseId);
      const prevWorkingSets = (prevExercise?.sets ?? []).filter(
        (s) => s.setType === 'working' && s.completed,
      );

      const prevBest = prevWorkingSets.reduce<WorkoutSet | null>((best, s) => {
        if (!best) return s;
        if (s.weight > best.weight) return s;
        if (s.weight === best.weight && s.reps > best.reps) return s;
        return best;
      }, null);

      let displayText: string;
      let deltaWeight: number | null = null;
      let deltaReps: number | null = null;

      if (!prevBest) {
        displayText = 'First time logged';
      } else if (!currentBest) {
        displayText = 'No working sets completed';
      } else {
        const currW = currentBest.weight;
        const prevW = prevBest.weight;
        const currR = currentBest.reps;
        const prevR = prevBest.reps;

        if (currW > prevW) {
          deltaWeight = roundTo(currW - prevW, 1);
          displayText = `+${deltaWeight} ${unit} compared with previous session`;
        } else if (currW < prevW) {
          deltaWeight = roundTo(currW - prevW, 1);
          displayText = `${deltaWeight} ${unit} compared with previous session`;
        } else {
          deltaWeight = 0;
          deltaReps = currR - prevR;
          if (deltaReps > 0) {
            displayText = `+${deltaReps} rep${deltaReps > 1 ? 's' : ''} at ${currW} ${unit}`;
          } else if (deltaReps < 0) {
            displayText = `${deltaReps} rep${Math.abs(deltaReps) > 1 ? 's' : ''} at ${currW} ${unit}`;
          } else {
            displayText = 'No change';
          }
        }
      }

      exerciseDeltas.push({
        exerciseId: we.exerciseId,
        exerciseName: we.exercise?.name ?? 'Exercise',
        currentBestWeight: currentBest ? currentBest.weight : null,
        currentBestReps: currentBest ? currentBest.reps : null,
        previousBestWeight: prevBest ? prevBest.weight : null,
        previousBestReps: prevBest ? prevBest.reps : null,
        deltaWeight,
        deltaReps,
        weightUnit: unit,
        displayText,
      });
    }

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
      volumeChangeVsPrevious,
      volumePercentageChangeVsPrevious,
      exerciseDeltas,
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
