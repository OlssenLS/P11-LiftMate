import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

describe('Drop Position Unique Constraints Migration', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('confirms unique constraint on (workout_exercise_id, position) is removed', async () => {
    const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'workout_sets' 
        AND indexname = 'workout_sets_workout_exercise_id_position_key';
    `);

    expect(indexes.length).toBe(0);
  });

  it('confirms unique constraint on (workout_id, position) is removed', async () => {
    const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'workout_exercises' 
        AND indexname = 'workout_exercises_workout_id_position_key';
    `);

    expect(indexes.length).toBe(0);
  });

  it('allows sets with overlapping or shifting positions without P2002 error', async () => {
    const user = await prisma.user.findFirst();
    const exercise = await prisma.exercise.findFirst();
    expect(user).toBeDefined();
    expect(exercise).toBeDefined();
    if (!user || !exercise) return;

    const workoutId = randomUUID();
    const weId = randomUUID();
    const set1Id = randomUUID();
    const set2Id = randomUUID();

    // Create test workout and exercise
    await prisma.workout.create({
      data: {
        id: workoutId,
        userId: user.id,
        name: 'Position Constraint Test Workout',
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    await prisma.workoutExercise.create({
      data: {
        id: weId,
        workoutId,
        exerciseId: exercise.id,
        position: 0,
      },
    });

    // Create set 1 at position 0
    await prisma.workoutSet.create({
      data: {
        id: set1Id,
        workoutExerciseId: weId,
        position: 0,
        setType: 'working',
        weight: 100,
        reps: 5,
        completed: true,
      },
    });

    // Soft-delete set 1
    await prisma.workoutSet.update({
      where: { id: set1Id },
      data: { deletedAt: new Date() },
    });

    // Inserting set 2 at position 0 must succeed now that unique constraint is removed
    const set2 = await prisma.workoutSet.create({
      data: {
        id: set2Id,
        workoutExerciseId: weId,
        position: 0,
        setType: 'working',
        weight: 105,
        reps: 5,
        completed: false,
      },
    });

    expect(set2).toBeDefined();
    expect(set2.id).toBe(set2Id);
    expect(set2.position).toBe(0);

    // Clean up
    await prisma.workout.delete({ where: { id: workoutId } });
  });
});
