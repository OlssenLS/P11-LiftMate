import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockPrisma: any;
  let mockAiProvider: any;
  let mockRateLimiter: any;

  beforeEach(() => {
    mockPrisma = {
      workout: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      foodLog: {
        findMany: vi.fn(),
      },
      bodyWeightLog: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      aiInsight: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn((promises) => Promise.all(promises)),
    };

    mockAiProvider = {
      generate: vi.fn(),
    };

    mockRateLimiter = {
      checkAndIncrement: vi.fn().mockResolvedValue({ remaining: 49 }),
    };

    service = new AnalyticsService(
      mockPrisma as any,
      mockAiProvider as any,
      mockRateLimiter as any,
    );
  });

  it('enforces data-sufficiency gate when user has fewer than 3 workouts or nutrition days (Spec §54)', async () => {
    mockPrisma.workout.count.mockResolvedValue(2);
    mockPrisma.foodLog.findMany.mockResolvedValue([{ loggedAt: new Date('2026-10-01') }]);
    mockPrisma.bodyWeightLog.count.mockResolvedValue(1);

    const sufficiency = await service.checkSufficiency('user-1');
    expect(sufficiency.isSufficient).toBe(false);
    expect(sufficiency.workoutCount).toBe(2);
    expect(sufficiency.nutritionDaysCount).toBe(1);
    expect(sufficiency.message).toContain('Complete at least several workout and nutrition entries');

    const overview = await service.getOverview('user-1');
    expect(overview.sufficiency.isSufficient).toBe(false);
    expect(overview.metrics).toBeNull();
    expect(overview.insights).toEqual([]);
    expect(mockAiProvider.generate).not.toHaveBeenCalled();
  });

  it('calculates deterministic metrics and detects stagnant lifts (Spec §51, §52)', async () => {
    const userId = 'user-1';
    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      weightKg: 80,
      preferences: {
        weeklyFrequency: 3,
        targetCalories: 2400,
        targetProtein: 160,
      },
    });

    const benchExercise = { id: 'bench-id', name: 'Bench Press' };
    const date1 = new Date('2026-10-01T10:00:00Z');
    const date2 = new Date('2026-10-03T10:00:00Z');
    const date3 = new Date('2026-10-05T10:00:00Z');
    const date4 = new Date('2026-10-07T10:00:00Z');

    mockPrisma.workout.findMany.mockResolvedValue([
      {
        id: 'w1',
        startedAt: date1,
        exercises: [
          {
            exerciseId: 'bench-id',
            exercise: benchExercise,
            sets: [{ setType: 'working', weight: 75, reps: 8, completed: true, rir: 2 }],
          },
        ],
      },
      {
        id: 'w2',
        startedAt: date2,
        exercises: [
          {
            exerciseId: 'bench-id',
            exercise: benchExercise,
            sets: [{ setType: 'working', weight: 75, reps: 8, completed: true, rir: 2 }],
          },
        ],
      },
      {
        id: 'w3',
        startedAt: date3,
        exercises: [
          {
            exerciseId: 'bench-id',
            exercise: benchExercise,
            sets: [{ setType: 'working', weight: 75, reps: 7, completed: true, rir: 1 }],
          },
        ],
      },
      {
        id: 'w4',
        startedAt: date4,
        exercises: [
          {
            exerciseId: 'bench-id',
            exercise: benchExercise,
            sets: [{ setType: 'working', weight: 75, reps: 7, completed: true, rir: 1 }],
          },
        ],
      },
    ]);

    mockPrisma.foodLog.findMany.mockResolvedValue([
      { loggedAt: date1, calories: 2200, protein: 140 },
      { loggedAt: date2, calories: 2300, protein: 145 },
      { loggedAt: date3, calories: 2100, protein: 130 },
      { loggedAt: date4, calories: 2400, protein: 150 },
    ]);

    mockPrisma.bodyWeightLog.findMany.mockResolvedValue([
      { loggedAt: date1, weightKg: 80.5 },
      { loggedAt: date4, weightKg: 80.1 },
    ]);

    const metrics = await service.calculateMetrics(userId);
    expect(metrics.workoutsCompleted).toBe(4);
    expect(metrics.stagnantExercises.length).toBeGreaterThan(0);
    expect(metrics.stagnantExercises[0].exerciseName).toBe('Bench Press');
    expect(metrics.stagnantExercises[0].currentLoadKg).toBe(75);
    expect(metrics.averageDailyCalories).toBeGreaterThan(2000);
    expect(metrics.averageDailyProteinGrams).toBeGreaterThan(130);
  });

  it('generates structured insights using fallback engine and saves to database', async () => {
    const userId = 'user-1';
    mockPrisma.workout.count.mockResolvedValue(4);
    mockPrisma.foodLog.findMany.mockResolvedValue([
      { loggedAt: new Date('2026-10-01') },
      { loggedAt: new Date('2026-10-02') },
      { loggedAt: new Date('2026-10-03') },
    ]);
    mockPrisma.bodyWeightLog.count.mockResolvedValue(2);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      preferences: { weeklyFrequency: 3, targetCalories: 2500, targetProtein: 160 },
    });
    mockPrisma.workout.findMany.mockResolvedValue([]);
    mockPrisma.bodyWeightLog.findMany.mockResolvedValue([]);
    mockPrisma.aiInsight.findMany.mockResolvedValue([]);

    mockPrisma.aiInsight.create.mockImplementation(({ data }: any) => ({
      id: 'insight-1',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // AI provider error triggers deterministic fallback
    mockAiProvider.generate.mockRejectedValue(new Error('AI Quota exceeded'));

    const result = await service.generateInsights(userId);
    expect(result.sufficiency.isSufficient).toBe(true);
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.primaryInsight).not.toBeNull();
    expect(result.primaryInsight?.category).toBeDefined();
    expect(mockPrisma.aiInsight.create).toHaveBeenCalled();
  });
});
