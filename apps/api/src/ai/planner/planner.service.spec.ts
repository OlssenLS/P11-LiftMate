import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlannerService } from './planner.service.js';

describe('PlannerService', () => {
  let service: PlannerService;
  let mockPrisma: any;
  let mockAiProvider: any;
  let mockProgramsService: any;
  let mockRateLimiter: any;

  const testUserId = '11111111-1111-1111-1111-111111111111';
  const ex1Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const ex2Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const ex3Id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const ex4Id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  const mockExercises = [
    {
      id: ex1Id,
      name: 'Barbell Bench Press',
      primaryMuscle: 'chest',
      equipment: 'barbell',
      deletedAt: null,
    },
    {
      id: ex2Id,
      name: 'Barbell Back Squat',
      primaryMuscle: 'quads',
      equipment: 'barbell',
      deletedAt: null,
    },
    {
      id: ex3Id,
      name: 'Barbell Bent Over Row',
      primaryMuscle: 'back',
      equipment: 'barbell',
      deletedAt: null,
    },
    {
      id: ex4Id,
      name: 'Overhead Press',
      primaryMuscle: 'shoulders',
      equipment: 'barbell',
      deletedAt: null,
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: testUserId,
          workoutDuration: '45_60',
          equipment: [{ equipment: 'barbell' }],
          preferences: {
            primaryGoal: 'build_muscle',
            experienceLevel: 'intermediate',
            weeklyFrequency: 3,
            avoidExercises: [],
          },
        }),
      },
      exercise: {
        findMany: vi.fn().mockResolvedValue(mockExercises),
      },
    };

    mockAiProvider = {
      generate: vi.fn(),
    };

    mockProgramsService = {
      create: vi.fn(),
      activate: vi.fn(),
    };

    mockRateLimiter = {
      checkAndIncrement: vi.fn().mockResolvedValue({ remaining: 48 }),
    };

    service = new PlannerService(
      mockPrisma,
      mockAiProvider,
      mockProgramsService,
      mockRateLimiter,
    );
  });

  describe('generatePlan', () => {
    it('uses deterministic fallback when AI fails and produces balanced split matching frequency', async () => {
      mockAiProvider.generate.mockRejectedValue(new Error('AI unavailable'));

      const plan = await service.generatePlan(testUserId, {
        frequency: 3,
        goal: 'build_muscle',
      });

      expect(mockRateLimiter.checkAndIncrement).toHaveBeenCalledWith(testUserId);
      expect(plan.frequency).toBe(3);
      expect(plan.days.length).toBe(3);
      expect(plan.goal).toBe('build_muscle');

      // Each day has valid exercises matching candidate catalog
      for (const day of plan.days) {
        expect(day.exercises.length).toBeGreaterThanOrEqual(4);
        for (const ex of day.exercises) {
          expect(mockExercises.some((me) => me.id === ex.exerciseId)).toBe(true);
        }
      }
    });

    it('validates AI output and replaces hallucinated exercise IDs with real DB exercises', async () => {
      // AI output with 1 real ID and 1 fake hallucinated ID
      const fakeAiOutput = {
        name: 'AI Hypertrophy Routine',
        description: 'Optimized 2-day split',
        days: [
          {
            day: 1,
            dayName: 'Upper Body',
            exercises: [
              {
                exerciseId: ex1Id, // real
                sets: 3,
                repMin: 8,
                repMax: 12,
                targetRir: 2,
                restSeconds: 90,
              },
              {
                exerciseId: 'ffffffff-ffff-ffff-ffff-ffffffffffff', // hallucinated fake ID
                sets: 3,
                repMin: 10,
                repMax: 12,
                targetRir: 2,
                restSeconds: 90,
              },
            ],
          },
          {
            day: 2,
            dayName: 'Lower Body',
            exercises: [
              {
                exerciseId: ex2Id, // real
                sets: 4,
                repMin: 6,
                repMax: 8,
                targetRir: 2,
                restSeconds: 120,
              },
            ],
          },
        ],
      };

      mockAiProvider.generate.mockResolvedValue({
        content: JSON.stringify(fakeAiOutput),
        finishReason: 'STOP',
      });

      const plan = await service.generatePlan(testUserId, {
        frequency: 2,
        goal: 'gain_strength',
      });

      expect(plan.days.length).toBe(2);

      // Verify all exercises in all days exist in mockExercises
      for (const day of plan.days) {
        for (const ex of day.exercises) {
          expect(mockExercises.some((me) => me.id === ex.exerciseId)).toBe(true);
        }
      }
    });
  });

  describe('confirmPlan', () => {
    it('creates and activates program from plan', async () => {
      const plan = {
        name: 'My 3-Day Plan',
        description: 'Great split',
        goal: 'build_muscle' as any,
        frequency: 3,
        duration: '45_60',
        days: [
          {
            day: 1,
            dayName: 'Day 1',
            exercises: [
              {
                exerciseId: ex1Id,
                exerciseName: 'Bench Press',
                primaryMuscle: 'chest' as any,
                equipment: 'barbell' as any,
                sets: 3,
                repMin: 8,
                repMax: 12,
                order: 1,
              },
            ],
          },
        ],
      };

      mockProgramsService.create.mockResolvedValue({
        id: 'prog-1',
        name: plan.name,
      });
      mockProgramsService.activate.mockResolvedValue({
        id: 'prog-1',
        name: plan.name,
        status: 'active',
      });

      const result = await service.confirmPlan(testUserId, {
        plan,
        activateImmediately: true,
      });

      expect(mockProgramsService.create).toHaveBeenCalled();
      expect(mockProgramsService.activate).toHaveBeenCalledWith(
        testUserId,
        'prog-1',
      );
      expect(result.id).toBe('prog-1');
    });
  });
});
