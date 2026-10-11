import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProgressService } from './progress.service.js';
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('ProgressService', () => {
  let service: ProgressService;
  let prismaMock: any;

  const mockUserId = 'user-uuid-1';
  const mockExerciseId = 'ex-uuid-1';

  beforeEach(() => {
    prismaMock = {
      $transaction: vi.fn(async (ops: any[]) => ops),
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      bodyWeightLog: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      exercise: {
        findUnique: vi.fn(),
      },
      workoutSet: {
        findMany: vi.fn(),
      },
      workout: {
        findMany: vi.fn(),
      },
      userPreferences: {
        findUnique: vi.fn(),
      },
      program: {
        findFirst: vi.fn(),
      },
      workoutExercise: {
        groupBy: vi.fn(),
      },
    };

    service = new ProgressService(prismaMock as unknown as PrismaService);
  });

  describe('getWeightProgress', () => {
    it('returns empty history and baseline weights for new user with no logs', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        weightKg: 75.0,
        targetWeightKg: 72.0,
        createdAt: new Date(),
      });
      prismaMock.bodyWeightLog.findMany.mockResolvedValue([]);

      const result = await service.getWeightProgress(mockUserId);
      expect(result.currentWeightKg).toBe(75.0);
      expect(result.startWeightKg).toBe(75.0);
      expect(result.targetWeightKg).toBe(72.0);
      expect(result.changeThisMonthKg).toBeNull();
      expect(result.history).toEqual([]);
      expect(result.sparkline).toEqual([75.0]);
    });

    it('calculates weight delta, history, and sparkline when logs exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        weightKg: 73.5,
        targetWeightKg: 70.0,
        createdAt: new Date('2026-08-01'),
      });

      const now = new Date();
      const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);

      prismaMock.bodyWeightLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          weightKg: '76.00',
          loggedAt: thirtyFiveDaysAgo,
          notes: 'Start',
        },
        {
          id: 'log-2',
          weightKg: '73.50',
          loggedAt: now,
          notes: 'Current',
        },
      ]);

      const result = await service.getWeightProgress(mockUserId);
      expect(result.startWeightKg).toBe(76.0);
      expect(result.currentWeightKg).toBe(73.5);
      expect(result.targetWeightKg).toBe(70.0);
      expect(result.changeThisMonthKg).toBe(-2.5);
      expect(result.history).toHaveLength(2);
      expect(result.sparkline).toEqual([76.0, 73.5]);
    });

    it('throws NotFoundException if user is missing', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.bodyWeightLog.findMany.mockResolvedValue([]);
      await expect(service.getWeightProgress('missing-user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('logWeight', () => {
    it('upserts weight log and updates user profile weight', async () => {
      const mockLog = {
        id: 'new-log-uuid',
        userId: mockUserId,
        weightKg: 73.2,
        loggedAt: new Date(),
        notes: 'Post workout',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      prismaMock.$transaction.mockResolvedValue([mockLog, {}]);

      const result = await service.logWeight(mockUserId, {
        weightKg: 73.2,
        notes: 'Post workout',
      });

      expect(result.weightKg).toBe(73.2);
      expect(result.notes).toBe('Post workout');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('getStrengthProgress', () => {
    it('returns empty progress when no completed sets exist for exercise', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue({
        id: mockExerciseId,
        name: 'Barbell Bench Press',
      });
      prismaMock.workoutSet.findMany.mockResolvedValue([]);

      const result = await service.getStrengthProgress(mockUserId, mockExerciseId);
      expect(result.exerciseName).toBe('Barbell Bench Press');
      expect(result.bestWeight).toBe(0);
      expect(result.bestReps).toBe(0);
      expect(result.maxEstimated1Rm).toBe(0);
      expect(result.history).toEqual([]);
    });

    it('calculates best weight, best reps, and max estimated 1RM deterministically', async () => {
      prismaMock.exercise.findUnique.mockResolvedValue({
        id: mockExerciseId,
        name: 'Barbell Bench Press',
      });

      prismaMock.workoutSet.findMany.mockResolvedValue([
        {
          id: 'set-1',
          weight: '80.00',
          reps: 8,
          workoutExercise: {
            workout: {
              startedAt: new Date('2026-10-01T10:00:00Z'),
            },
          },
        },
        {
          id: 'set-2',
          weight: '90.00',
          reps: 5,
          workoutExercise: {
            workout: {
              startedAt: new Date('2026-10-08T10:00:00Z'),
            },
          },
        },
      ]);

      const result = await service.getStrengthProgress(mockUserId, mockExerciseId);
      expect(result.exerciseName).toBe('Barbell Bench Press');
      expect(result.bestWeight).toBe(90);
      expect(result.bestReps).toBe(5);

      // 80kg x 8 reps: 80 * (1 + 8/30) = 101.3
      // 90kg x 5 reps: 90 * (1 + 5/30) = 105.0
      expect(result.maxEstimated1Rm).toBe(105);
      expect(result.history).toHaveLength(2);
      expect(result.history[0].estimated1Rm).toBe(101.3);
      expect(result.history[1].estimated1Rm).toBe(105);
    });
  });

  describe('getVolumeProgress', () => {
    it('aggregates volume by muscle group and generates history', async () => {
      prismaMock.workout.findMany.mockResolvedValue([
        {
          id: 'w-1',
          startedAt: new Date('2026-10-10T08:00:00Z'),
          exercises: [
            {
              exercise: { primaryMuscle: 'chest' },
              sets: [
                { weight: '80', reps: 10 }, // 800 kg
                { weight: '80', reps: 10 }, // 800 kg
              ],
            },
            {
              exercise: { primaryMuscle: 'triceps' },
              sets: [
                { weight: '30', reps: 10 }, // 300 kg
              ],
            },
          ],
        },
      ]);

      const result = await service.getVolumeProgress(mockUserId, 'week');
      expect(result.totalVolumeKg).toBe(1900); // 800 + 800 + 300
      expect(result.byMuscleGroup).toHaveLength(2);
      expect(result.byMuscleGroup[0].muscleGroup).toBe('chest');
      expect(result.byMuscleGroup[0].volumeKg).toBe(1600);
      expect(result.byMuscleGroup[0].percentage).toBe(Math.round((1600 / 1900) * 100));
      expect(result.byMuscleGroup[1].muscleGroup).toBe('triceps');
      expect(result.byMuscleGroup[1].volumeKg).toBe(300);
    });
  });

  describe('getConsistencyProgress', () => {
    it('calculates consistency percentage against planned weekly frequency', async () => {
      prismaMock.userPreferences.findUnique.mockResolvedValue({ weeklyFrequency: 4 });
      prismaMock.program.findFirst.mockResolvedValue({ frequency: 4 });

      const now = new Date();
      prismaMock.workout.findMany.mockResolvedValue([
        { startedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { startedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        { startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
      ]);

      const result = await service.getConsistencyProgress(mockUserId);
      expect(result.plannedSessions).toBe(4);
      expect(result.completedSessions).toBe(3);
      expect(result.consistencyPct).toBe(75);
      expect(result.weeklyBreakdown).toHaveLength(4);
    });
  });
});
