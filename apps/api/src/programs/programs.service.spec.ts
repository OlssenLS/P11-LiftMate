import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProgramsService, ProgramStatus } from './programs.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FitnessGoal } from '@liftmate/shared';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { WorkoutsService } from '../workouts/workouts.service.js';

describe('ProgramsService', () => {
  let service: ProgramsService;
  let prismaMock: any;
  let workoutsServiceMock: any;
  let txMock: any;

  const mockUserId = 'user-uuid-1';
  const mockProgramId = 'prog-uuid-1';

  beforeEach(() => {
    txMock = {
      program: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn(),
        update: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
      programExercise: {
        createMany: vi.fn().mockResolvedValue({ count: 5 }),
      },
    };

    prismaMock = {
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(txMock)),
      program: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      exercise: {
        findMany: vi.fn(),
      },
    };

    workoutsServiceMock = {
      previousSession: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    };

    service = new ProgramsService(
      prismaMock as unknown as PrismaService,
      workoutsServiceMock as unknown as WorkoutsService,
    );
  });

  describe('getTemplates', () => {
    it('returns the list of starter templates', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(4);
      expect(templates.some((t) => t.id === 'full-body-3day')).toBe(true);
      expect(templates.some((t) => t.id === 'bodyweight-3day')).toBe(true);
    });
  });

  describe('getCurrent', () => {
    it('returns existing active program if present', async () => {
      const mockRow = {
        id: mockProgramId,
        userId: mockUserId,
        name: 'Full Body 3-Day Foundation',
        goal: 'build_muscle',
        frequency: 3,
        duration: '45_60',
        description: 'Test description',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        programExercises: [
          {
            id: 'pe-1',
            programId: mockProgramId,
            day: 1,
            dayName: 'Full Body A',
            exerciseId: 'ex-1',
            sets: 3,
            repMin: 8,
            repMax: 12,
            targetRir: 2,
            restSeconds: 90,
            order: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            exercise: {
              id: 'ex-1',
              name: 'Barbell Bench Press',
              primaryMuscle: 'chest',
              secondaryMuscles: ['triceps'],
              equipment: 'barbell',
              movementPattern: 'push',
              difficulty: 'intermediate',
              instructions: 'Press bar up',
              externalId: 'barbell-bench-press',
              alternativeExercises: [],
            },
          },
        ],
      };

      prismaMock.program.findFirst.mockResolvedValue(mockRow);

      const result = await service.getCurrent(mockUserId);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockProgramId);
      expect(result?.programExercises.length).toBe(1);
      expect(result?.programExercises[0].exercise?.name).toBe('Barbell Bench Press');
    });

    it('returns null if no active program and user has not onboarded', async () => {
      prismaMock.program.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({ onboardedAt: null });

      const result = await service.getCurrent(mockUserId);
      expect(result).toBeNull();
    });
  });

  describe('activate', () => {
    it('archives active programs and sets the specified program active', async () => {
      prismaMock.program.findFirst.mockResolvedValue({
        id: mockProgramId,
        userId: mockUserId,
      });

      const updatedRow = {
        id: mockProgramId,
        userId: mockUserId,
        name: 'Upper/Lower',
        goal: 'build_muscle',
        frequency: 4,
        duration: '45_60',
        description: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        programExercises: [],
      };

      txMock.program.update.mockResolvedValue(updatedRow);

      const result = await service.activate(mockUserId, mockProgramId);
      expect(txMock.program.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          status: ProgramStatus.active,
          id: { not: mockProgramId },
          deletedAt: null,
        },
        data: { status: ProgramStatus.archived },
      });
      expect(result.status).toBe(ProgramStatus.active);
    });

    it('throws NotFoundException if program does not exist', async () => {
      prismaMock.program.findFirst.mockResolvedValue(null);
      await expect(service.activate(mockUserId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('startProgramDay', () => {
    const mockProgramWithDays = {
      id: mockProgramId,
      name: 'Full Body 3-Day Foundation',
      programExercises: [
        {
          id: 'pe-1',
          day: 1,
          dayName: 'Full Body A',
          exerciseId: 'ex-1',
          sets: 3,
          repMin: 8,
          repMax: 12,
          targetRir: 2,
          restSeconds: 90,
          order: 1,
        },
        {
          id: 'pe-2',
          day: 1,
          dayName: 'Full Body A',
          exerciseId: 'ex-2',
          sets: 4,
          repMin: 6,
          repMax: 8,
          targetRir: 2,
          restSeconds: 120,
          order: 2,
        },
      ],
    };

    it('generates an in-progress workout with prefilled exercises and sets', async () => {
      prismaMock.program.findFirst.mockResolvedValue(mockProgramWithDays);
      workoutsServiceMock.previousSession.mockResolvedValue({
        exercises: [
          {
            exerciseId: 'ex-1',
            sets: [{ setType: 'working', weight: 80 }],
          },
        ],
      });

      const mockCreatedWorkout = {
        id: 'workout-new-1',
        name: 'Full Body 3-Day Foundation - Full Body A',
        status: 'in_progress',
        programId: mockProgramId,
        startedAt: new Date(),
        exercises: [],
      };
      workoutsServiceMock.create.mockResolvedValue(mockCreatedWorkout);

      const result = await service.startProgramDay(mockUserId, mockProgramId, 1);
      expect(result).toBe(mockCreatedWorkout);
      expect(workoutsServiceMock.create).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          name: 'Full Body 3-Day Foundation - Full Body A',
          programId: mockProgramId,
          status: 'in_progress',
          exercises: expect.arrayContaining([
            expect.objectContaining({
              exerciseId: 'ex-1',
              sets: expect.arrayContaining([
                expect.objectContaining({
                  weight: 80, // Progressive overload baseline from previousSession
                  reps: 8,
                  rir: 2,
                  restTime: 90,
                  completed: false,
                }),
              ]),
            }),
            expect.objectContaining({
              exerciseId: 'ex-2',
              sets: expect.arrayContaining([
                expect.objectContaining({
                  weight: 0, // Fallback when no previous session
                  reps: 6,
                  rir: 2,
                  restTime: 120,
                  completed: false,
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it('throws BadRequestException if day has no exercises', async () => {
      prismaMock.program.findFirst.mockResolvedValue(mockProgramWithDays);
      await expect(
        service.startProgramDay(mockUserId, mockProgramId, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if program is not found', async () => {
      prismaMock.program.findFirst.mockResolvedValue(null);
      await expect(
        service.startProgramDay(mockUserId, 'unknown', 1),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
