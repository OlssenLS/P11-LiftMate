import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateProgramInput,
  Program,
  Workout,
} from '@liftmate/shared';
import { FitnessGoal, ProgramStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { STARTER_TEMPLATES, type StarterTemplate } from './templates/starter-templates.js';
import { RuleEngine, type ExerciseLookupItem } from './rule-engine.js';
import { WorkoutsService } from '../workouts/workouts.service.js';

const programInclude = {
  programExercises: {
    where: { deletedAt: null },
    orderBy: [{ day: 'asc' }, { order: 'asc' }],
    include: {
      exercise: true,
    },
  },
} satisfies Prisma.ProgramInclude;

type ProgramRow = Prisma.ProgramGetPayload<{ include: typeof programInclude }>;

export function toProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    goal: row.goal as FitnessGoal,
    frequency: row.frequency,
    duration: row.duration,
    description: row.description,
    status: row.status as ProgramStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    programExercises: row.programExercises.map((pe) => ({
      id: pe.id,
      programId: pe.programId,
      day: pe.day,
      dayName: pe.dayName,
      exerciseId: pe.exerciseId,
      exercise: pe.exercise
        ? {
            id: pe.exercise.id,
            name: pe.exercise.name,
            primaryMuscle: pe.exercise.primaryMuscle,
            secondaryMuscles: pe.exercise.secondaryMuscles,
            equipment: pe.exercise.equipment,
            movementPattern: pe.exercise.movementPattern,
            difficulty: pe.exercise.difficulty,
            instructions: pe.exercise.instructions,
            externalId: pe.exercise.externalId,
            alternativeExercises: pe.exercise.alternativeExercises,
          }
        : undefined,
      sets: pe.sets,
      repMin: pe.repMin,
      repMax: pe.repMax,
      targetRir: pe.targetRir,
      restSeconds: pe.restSeconds,
      order: pe.order,
      createdAt: pe.createdAt,
      updatedAt: pe.updatedAt,
      deletedAt: pe.deletedAt,
    })),
  };
}

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workoutsService: WorkoutsService,
  ) {}

  /**
   * Retrieves the current active program for the user.
   * If the user is onboarded but has no active program, automatically
   * selects and assigns a recommended starter template program.
   */
  async getCurrent(userId: string): Promise<Program | null> {
    const activeRow = await this.prisma.program.findFirst({
      where: {
        userId,
        status: ProgramStatus.active,
        deletedAt: null,
      },
      include: programInclude,
      orderBy: { createdAt: 'desc' },
    });

    if (activeRow) {
      return toProgram(activeRow);
    }

    // Check if user has completed onboarding to auto-assign
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { onboardedAt: true },
    });

    if (user?.onboardedAt) {
      return this.assignRecommendedProgram(userId);
    }

    return null;
  }

  /**
   * Lists all programs for a user, optionally filtered by status.
   */
  async list(userId: string, status?: ProgramStatus): Promise<Program[]> {
    const rows = await this.prisma.program.findMany({
      where: {
        userId,
        status: status ? (status as any) : undefined,
        deletedAt: null,
      },
      include: programInclude,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(toProgram);
  }

  /**
   * Retrieves the starter template library.
   */
  getTemplates(): StarterTemplate[] {
    return STARTER_TEMPLATES;
  }

  /**
   * Retrieves a single program by ID.
   */
  async getById(userId: string, id: string): Promise<Program> {
    const row = await this.prisma.program.findFirst({
      where: {
        id,
        OR: [{ userId }, { userId: null }],
        deletedAt: null,
      },
      include: programInclude,
    });

    if (!row) {
      throw new NotFoundException(`Program not found`);
    }

    return toProgram(row);
  }

  /**
   * Evaluates user preferences and equipment via RuleEngine to select, clone,
   * and activate the best-matching starter template program.
   */
  async assignRecommendedProgram(userId: string): Promise<Program> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        equipment: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const availableEquipment = user.equipment.map((e) => e.equipment);
    const goal = (user.preferences?.primaryGoal as FitnessGoal) ?? FitnessGoal.build_muscle;
    const frequency = user.preferences?.weeklyFrequency ?? 3;
    const avoidExercises = user.preferences?.avoidExercises ?? [];

    const exerciseCatalog = await this.prisma.exercise.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        externalId: true,
        equipment: true,
        alternativeExercises: true,
      },
    });

    const selection = RuleEngine.selectBestTemplate(
      {
        goal,
        frequency,
        availableEquipment,
        avoidExercises,
      },
      exerciseCatalog as ExerciseLookupItem[],
      STARTER_TEMPLATES,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      // Archive any currently active programs for this user
      await tx.program.updateMany({
        where: {
          userId,
          status: ProgramStatus.active,
          deletedAt: null,
        },
        data: { status: ProgramStatus.archived },
      });

      // Create new user program
      const programRow = await tx.program.create({
        data: {
          userId,
          name: selection.template.name,
          goal: selection.template.goal,
          frequency: selection.template.frequency,
          duration: selection.template.duration,
          description: selection.template.description,
          status: ProgramStatus.active,
        },
      });

      // Insert resolved program exercises
      if (selection.exercises.length > 0) {
        await tx.programExercise.createMany({
          data: selection.exercises.map((e) => ({
            programId: programRow.id,
            day: e.day,
            dayName: e.dayName,
            exerciseId: e.exerciseId,
            sets: e.sets,
            repMin: e.repMin,
            repMax: e.repMax,
            targetRir: e.targetRir,
            restSeconds: e.restSeconds,
            order: e.order,
          })),
        });
      }

      return tx.program.findUniqueOrThrow({
        where: { id: programRow.id },
        include: programInclude,
      });
    }, { maxWait: 10000, timeout: 30000 });

    return toProgram(created);
  }

  /**
   * Creates a custom program for the user.
   */
  async create(userId: string, input: CreateProgramInput): Promise<Program> {
    const created = await this.prisma.$transaction(async (tx) => {
      if (input.status === ProgramStatus.active) {
        await tx.program.updateMany({
          where: {
            userId,
            status: ProgramStatus.active,
            deletedAt: null,
          },
          data: { status: ProgramStatus.archived },
        });
      }

      const programRow = await tx.program.create({
        data: {
          id: input.id,
          userId,
          name: input.name,
          goal: input.goal as any,
          frequency: input.frequency,
          duration: input.duration,
          description: input.description,
          status: input.status as any,
        },
      });

      if (input.exercises && input.exercises.length > 0) {
        await tx.programExercise.createMany({
          data: input.exercises.map((e) => ({
            id: e.id,
            programId: programRow.id,
            day: e.day,
            dayName: e.dayName ?? null,
            exerciseId: e.exerciseId,
            sets: e.sets,
            repMin: e.repMin,
            repMax: e.repMax,
            targetRir: e.targetRir ?? null,
            restSeconds: e.restSeconds ?? null,
            order: e.order,
          })),
        });
      }

      return tx.program.findUniqueOrThrow({
        where: { id: programRow.id },
        include: programInclude,
      });
    }, { maxWait: 10000, timeout: 30000 });

    return toProgram(created);
  }

  /**
   * Activates a program and archives other active programs.
   */
  async activate(userId: string, programId: string): Promise<Program> {
    const existing = await this.prisma.program.findFirst({
      where: { id: programId, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Program not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.program.updateMany({
        where: {
          userId,
          status: ProgramStatus.active,
          id: { not: programId },
          deletedAt: null,
        },
        data: { status: ProgramStatus.archived },
      });

      return tx.program.update({
        where: { id: programId },
        data: { status: ProgramStatus.active },
        include: programInclude,
      });
    }, { maxWait: 10000, timeout: 30000 });

    return toProgram(updated);
  }

  /**
   * Instantiates an active workout from a scheduled program day (§38).
   * Pre-fills exercises, sets, target reps, target RIR, rest seconds,
   * and queries previous session weights for progressive overload.
   */
  async startProgramDay(
    userId: string,
    programId: string,
    day: number,
  ): Promise<Workout> {
    const program = await this.prisma.program.findFirst({
      where: {
        id: programId,
        OR: [{ userId }, { userId: null }],
        deletedAt: null,
      },
      include: programInclude,
    });

    if (!program) {
      throw new NotFoundException(`Program not found`);
    }

    const dayExercises = program.programExercises.filter((pe) => pe.day === day);
    if (dayExercises.length === 0) {
      throw new BadRequestException(
        `Program "${program.name}" has no scheduled exercises for Day ${day}`,
      );
    }

    const dayName = dayExercises[0]?.dayName ?? `Day ${day}`;
    const workoutName = `${program.name} - ${dayName}`;

    // Pre-fill exercises and sets
    const exercisesInput = await Promise.all(
      dayExercises.map(async (pe, exIdx) => {
        // Look up previous session weight if available
        let baselineWeight = 0;
        try {
          const prev = await this.workoutsService.previousSession(userId, pe.exerciseId);
          if (prev) {
            const matchEx = prev.exercises.find((e) => e.exerciseId === pe.exerciseId);
            const workingSets = matchEx?.sets.filter((s) => s.setType === 'working') ?? [];
            if (workingSets.length > 0) {
              baselineWeight = workingSets[workingSets.length - 1].weight ?? 0;
            }
          }
        } catch {
          // Fallback to 0 if lookup fails
          baselineWeight = 0;
        }

        const sets = Array.from({ length: pe.sets }, (_, sIdx) => ({
          id: crypto.randomUUID(),
          position: sIdx + 1,
          setType: 'working' as const,
          weight: baselineWeight,
          weightUnit: 'kg' as const,
          reps: pe.repMin,
          rir: pe.targetRir ?? null,
          rirUnknown: pe.targetRir === null || pe.targetRir === undefined,
          restTime: pe.restSeconds ?? null,
          completed: false,
        }));

        return {
          id: crypto.randomUUID(),
          exerciseId: pe.exerciseId,
          position: exIdx + 1,
          sets,
        };
      }),
    );

    const workoutId = crypto.randomUUID();
    return this.workoutsService.create(userId, {
      id: workoutId,
      name: workoutName,
      programId: program.id,
      status: 'in_progress',
      startedAt: new Date(),
      exercises: exercisesInput,
    });
  }
}
