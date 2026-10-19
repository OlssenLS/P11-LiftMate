import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

describe('Migration M-C Programs & Program Exercises Integrity', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('supports ProgramStatus enum values in the database', async () => {
    const enumRows = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'ProgramStatus'
      ORDER BY e.enumsortorder;
    `);

    const labels = enumRows.map((r: { enumlabel: string }) => r.enumlabel);
    expect(labels).toContain('active');
    expect(labels).toContain('completed');
    expect(labels).toContain('archived');
  });

  it('can create a program and associated program exercises', async () => {
    const user = await prisma.user.findFirst();
    const exercise = await prisma.exercise.findFirst();
    expect(user).toBeDefined();
    expect(exercise).toBeDefined();
    if (!user || !exercise) return;

    const programId = randomUUID();
    const programExId = randomUUID();

    // Create a template or user program
    const program = await prisma.program.create({
      data: {
        id: programId,
        userId: user.id,
        name: 'M-C Test Upper/Lower 4-Day',
        goal: 'build_muscle',
        frequency: 4,
        duration: '45_60',
        description: 'Test program created by Migration M-C suite',
        status: 'active',
      },
    });

    expect(program.id).toBe(programId);
    expect(program.name).toBe('M-C Test Upper/Lower 4-Day');
    expect(program.frequency).toBe(4);

    // Create program exercise
    const programExercise = await prisma.programExercise.create({
      data: {
        id: programExId,
        programId,
        day: 1,
        dayName: 'Upper Body A',
        exerciseId: exercise.id,
        sets: 3,
        repMin: 8,
        repMax: 12,
        targetRir: 2,
        restSeconds: 120,
        order: 0,
      },
    });

    expect(programExercise.id).toBe(programExId);
    expect(programExercise.day).toBe(1);
    expect(programExercise.dayName).toBe('Upper Body A');
    expect(programExercise.sets).toBe(3);

    // Verify workout linking to program
    const workoutId = randomUUID();
    const workout = await prisma.workout.create({
      data: {
        id: workoutId,
        userId: user.id,
        name: 'Upper Body A - Session 1',
        programId,
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    expect(workout.programId).toBe(programId);

    // Cleanup
    await prisma.workout.delete({ where: { id: workoutId } });
    await prisma.program.delete({ where: { id: programId } });
  });
});
