import { Injectable } from '@nestjs/common';
import type { Exercise, ExerciseSearch } from '@liftmate/shared';
import type { Exercise as PrismaExercise, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

/** Map a Prisma Exercise row to the shared `Exercise` read model. */
export function toExercise(row: PrismaExercise): Exercise {
  return {
    id: row.id,
    name: row.name,
    primaryMuscle: row.primaryMuscle,
    secondaryMuscles: row.secondaryMuscles,
    equipment: row.equipment,
    movementPattern: row.movementPattern,
    difficulty: row.difficulty,
    instructions: row.instructions,
    externalId: row.externalId,
  };
}

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Search/filter the exercise DB by muscle, equipment, difficulty, and name. */
  async search(params: ExerciseSearch): Promise<Exercise[]> {
    const where: Prisma.ExerciseWhereInput = { deletedAt: null };
    if (params.q) {
      where.name = { contains: params.q, mode: 'insensitive' };
    }
    if (params.muscle) {
      // Match either the primary muscle or any secondary muscle.
      where.OR = [{ primaryMuscle: params.muscle }, { secondaryMuscles: { has: params.muscle } }];
    }
    if (params.equipment) {
      where.equipment = params.equipment;
    }
    if (params.difficulty) {
      where.difficulty = params.difficulty;
    }

    const rows = await this.prisma.exercise.findMany({
      where,
      orderBy: { name: 'asc' },
      take: params.limit,
      skip: params.offset,
    });
    return rows.map(toExercise);
  }

  async findById(id: string): Promise<Exercise | null> {
    const row = await this.prisma.exercise.findFirst({ where: { id, deletedAt: null } });
    return row ? toExercise(row) : null;
  }
}
