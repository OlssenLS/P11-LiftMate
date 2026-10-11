import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Migration M-B Data Integrity & Workout Preservation', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('supports WorkoutStatus enum values in the database', async () => {
    const enumRows = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'WorkoutStatus'
      ORDER BY e.enumsortorder;
    `);

    const labels = enumRows.map((r) => r.enumlabel);
    expect(labels).toContain('in_progress');
    expect(labels).toContain('completed');
    expect(labels).toContain('cancelled');
  });

  it('exercises table includes alternative_exercises array column', async () => {
    const exercise = await prisma.exercise.findFirst();
    expect(exercise).toBeDefined();
    if (exercise) {
      expect(Array.isArray(exercise.alternativeExercises)).toBe(true);
    }
  });

  it('workouts table supports status, notes, and program_id with backward compatibility', async () => {
    const user = await prisma.user.findFirst();
    expect(user).toBeDefined();
    if (!user) return;

    // Create a workout with M-B columns
    const testWorkout = await prisma.workout.create({
      data: {
        userId: user.id,
        name: 'Migration M-B Verification Workout',
        notes: 'Testing notes column and in_progress status',
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    expect(testWorkout.id).toBeDefined();
    expect(testWorkout.notes).toBe('Testing notes column and in_progress status');
    expect(testWorkout.status).toBe('in_progress');
    expect(testWorkout.programId).toBeNull();

    // Verify workout_sets supports notes, rest_time, rir_unknown, rpe
    const exercise = await prisma.exercise.findFirst();
    if (exercise) {
      const we = await prisma.workoutExercise.create({
        data: {
          workoutId: testWorkout.id,
          exerciseId: exercise.id,
          position: 0,
        },
      });

      const set = await prisma.workoutSet.create({
        data: {
          workoutExerciseId: we.id,
          position: 0,
          setType: 'working',
          weight: 100.5,
          reps: 8,
          rir: 2,
          rirUnknown: false,
          rpe: 8.5,
          restTime: 120,
          notes: 'Smooth set',
          completed: true,
        },
      });

      expect(set.rirUnknown).toBe(false);
      expect(Number(set.rpe)).toBe(8.5);
      expect(set.restTime).toBe(120);
      expect(set.notes).toBe('Smooth set');
    }

    // Clean up created test row
    await prisma.workout.delete({ where: { id: testWorkout.id } });
  });
});
