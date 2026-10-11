import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { calculateEstimated1RM } from '@liftmate/shared';

describe('Migration M-E Progress & Metrics Schema Integrity', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('calculates estimated 1RM deterministically per Epley formula', () => {
    // 1 rep at 100kg should be 100kg
    expect(calculateEstimated1RM(100, 1)).toBe(100);

    // 10 reps at 100kg: 100 * (1 + 10/30) = 133.3 kg
    expect(calculateEstimated1RM(100, 10)).toBe(133.3);

    // 5 reps at 80kg: 80 * (1 + 5/30) = 93.3 kg
    expect(calculateEstimated1RM(80, 5)).toBe(93.3);

    // edge cases
    expect(calculateEstimated1RM(0, 10)).toBe(0);
    expect(calculateEstimated1RM(100, 0)).toBe(0);
  });

  it('can create, read, update, and soft-delete body_weight_logs', async () => {
    const user = await prisma.user.findFirst();
    expect(user).toBeDefined();
    if (!user) return;

    const testLogId = randomUUID();

    // 1. Create BodyWeightLog
    const log = await prisma.bodyWeightLog.create({
      data: {
        id: testLogId,
        userId: user.id,
        weightKg: 74.5,
        loggedAt: new Date(),
        notes: 'Morning weigh-in before breakfast',
      },
    });

    expect(log.id).toBe(testLogId);
    expect(Number(log.weightKg)).toBe(74.5);
    expect(log.notes).toBe('Morning weigh-in before breakfast');

    // 2. Update BodyWeightLog
    const updated = await prisma.bodyWeightLog.update({
      where: { id: testLogId },
      data: {
        weightKg: 74.2,
      },
    });
    expect(Number(updated.weightKg)).toBe(74.2);

    // 3. Soft-delete BodyWeightLog
    const softDeleted = await prisma.bodyWeightLog.update({
      where: { id: testLogId },
      data: {
        deletedAt: new Date(),
      },
    });
    expect(softDeleted.deletedAt).not.toBeNull();

    // Cleanup
    await prisma.bodyWeightLog.delete({ where: { id: testLogId } });
  });

  it('can create and upsert exercise_personal_records with unique constraint', async () => {
    const user = await prisma.user.findFirst();
    const exercise = await prisma.exercise.findFirst();
    expect(user).toBeDefined();
    expect(exercise).toBeDefined();
    if (!user || !exercise) return;

    const prId = randomUUID();

    // 1. Create PR
    const pr = await prisma.exercisePersonalRecord.upsert({
      where: {
        userId_exerciseId: {
          userId: user.id,
          exerciseId: exercise.id,
        },
      },
      update: {
        maxWeight: 100,
        maxReps: 5,
        maxEstimated1Rm: 116.7,
        achievedAt: new Date(),
      },
      create: {
        id: prId,
        userId: user.id,
        exerciseId: exercise.id,
        maxWeight: 100,
        maxReps: 5,
        maxEstimated1Rm: 116.7,
        achievedAt: new Date(),
      },
    });

    expect(Number(pr.maxWeight)).toBe(100);
    expect(pr.maxReps).toBe(5);
    expect(Number(pr.maxEstimated1Rm)).toBe(116.7);

    // 2. Upsert with higher weight
    const updatedPr = await prisma.exercisePersonalRecord.upsert({
      where: {
        userId_exerciseId: {
          userId: user.id,
          exerciseId: exercise.id,
        },
      },
      update: {
        maxWeight: 105,
        maxReps: 5,
        maxEstimated1Rm: 122.5,
      },
      create: {
        userId: user.id,
        exerciseId: exercise.id,
        maxWeight: 105,
        maxReps: 5,
        maxEstimated1Rm: 122.5,
        achievedAt: new Date(),
      },
    });

    expect(Number(updatedPr.maxWeight)).toBe(105);
    expect(Number(updatedPr.maxEstimated1Rm)).toBe(122.5);

    // Cleanup
    await prisma.exercisePersonalRecord.delete({
      where: {
        userId_exerciseId: {
          userId: user.id,
          exerciseId: exercise.id,
        },
      },
    });
  });
});
