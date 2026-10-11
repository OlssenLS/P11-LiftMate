import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { WorkoutsService } from './workouts.service.js';

const now = new Date('2026-01-02T10:00:00Z');
const start = new Date('2026-01-02T09:00:00Z');

/** Build a Prisma-shaped workout row with the given sets on one exercise. */
function workoutRow(
  id: string,
  startedAt: Date,
  completedAt: Date | null,
  sets: {
    setType: 'warmup' | 'working';
    weight: number;
    reps: number;
    completed: boolean;
  }[],
  exerciseName = 'Bench Press',
) {
  return {
    id,
    userId: 'u1',
    name: 'Push day',
    notes: null,
    status: 'completed' as const,
    programId: null,
    startedAt,
    completedAt,
    createdAt: startedAt,
    updatedAt: startedAt,
    deletedAt: null,
    exercises: [
      {
        id: 'we1',
        workoutId: id,
        exerciseId: 'ex1',
        position: 0,
        createdAt: startedAt,
        updatedAt: startedAt,
        deletedAt: null,
        exercise: {
          id: 'ex1',
          name: exerciseName,
          primaryMuscle: 'chest',
          secondaryMuscles: ['triceps'],
          equipment: 'barbell',
          movementPattern: 'push',
          difficulty: 'intermediate',
          instructions: null,
          externalId: null,
          alternativeExercises: [],
        },
        sets: sets.map((s, i) => ({
          id: `set-${id}-${i}`,
          workoutExerciseId: 'we1',
          position: i,
          setType: s.setType,
          weight: s.weight,
          weightUnit: 'kg',
          reps: s.reps,
          rir: null,
          rirUnknown: false,
          rpe: null,
          restTime: null,
          notes: null,
          completed: s.completed,
          createdAt: startedAt,
          updatedAt: startedAt,
          deletedAt: null,
        })),
      },
    ],
  };
}

describe('WorkoutsService', () => {
  let service: WorkoutsService;
  const prisma = {
    workout: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkoutsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(WorkoutsService);
  });

  describe('summary and performance deltas (WORKOUT_UX.md §9.2)', () => {
    it('computes volume, percentage change, and weight increase delta', async () => {
      const current = workoutRow('w2', start, now, [
        { setType: 'warmup', weight: 60, reps: 10, completed: true },
        { setType: 'working', weight: 102.5, reps: 5, completed: true },
        { setType: 'working', weight: 100, reps: 5, completed: true },
        { setType: 'working', weight: 100, reps: 5, completed: false },
      ]);
      const previous = workoutRow(
        'w1',
        new Date('2026-01-01T09:00:00Z'),
        new Date('2026-01-01T10:00:00Z'),
        [
          { setType: 'working', weight: 100, reps: 5, completed: true },
          { setType: 'working', weight: 100, reps: 5, completed: true },
        ],
      );

      prisma.workout.findFirst
        .mockResolvedValueOnce(current) // getById
        .mockResolvedValueOnce(previous); // previous session for volume

      prisma.workout.findMany.mockResolvedValueOnce([previous]); // exerciseHistory for delta

      const summary = await service.summary('u1', 'w2');

      expect(summary.totalVolume).toBe(1012.5); // 102.5*5 + 100*5 = 512.5 + 500
      expect(summary.totalWorkingSets).toBe(2);
      expect(summary.totalSets).toBe(4);
      expect(summary.exerciseCount).toBe(1);
      expect(summary.durationSeconds).toBe(3600);
      expect(summary.volumeChangeVsPrevious).toBe(12.5); // 1012.5 - 1000
      expect(summary.volumePercentageChangeVsPrevious).toBe(1.3);

      expect(summary.exerciseDeltas).toHaveLength(1);
      const delta = summary.exerciseDeltas[0];
      expect(delta.exerciseName).toBe('Bench Press');
      expect(delta.currentBestWeight).toBe(102.5);
      expect(delta.previousBestWeight).toBe(100);
      expect(delta.deltaWeight).toBe(2.5);
      expect(delta.displayText).toBe('+2.5 kg compared with previous session');
    });

    it('computes rep delta when heaviest weight is unchanged', async () => {
      const current = workoutRow('w2', start, now, [
        { setType: 'working', weight: 80, reps: 9, completed: true },
      ]);
      const previous = workoutRow(
        'w1',
        new Date('2026-01-01T09:00:00Z'),
        new Date('2026-01-01T10:00:00Z'),
        [
          { setType: 'working', weight: 80, reps: 8, completed: true },
        ],
      );

      prisma.workout.findFirst
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(previous);

      prisma.workout.findMany.mockResolvedValueOnce([previous]);

      const summary = await service.summary('u1', 'w2');
      expect(summary.exerciseDeltas[0].displayText).toBe('+1 rep at 80 kg');
      expect(summary.exerciseDeltas[0].deltaReps).toBe(1);
      expect(summary.exerciseDeltas[0].deltaWeight).toBe(0);
    });

    it('reports No change when weight and reps are identical', async () => {
      const current = workoutRow('w2', start, now, [
        { setType: 'working', weight: 80, reps: 8, completed: true },
      ]);
      const previous = workoutRow(
        'w1',
        new Date('2026-01-01T09:00:00Z'),
        new Date('2026-01-01T10:00:00Z'),
        [
          { setType: 'working', weight: 80, reps: 8, completed: true },
        ],
      );

      prisma.workout.findFirst
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(previous);

      prisma.workout.findMany.mockResolvedValueOnce([previous]);

      const summary = await service.summary('u1', 'w2');
      expect(summary.exerciseDeltas[0].displayText).toBe('No change');
    });

    it('reports First time logged when exercise has no previous completed session', async () => {
      const current = workoutRow('w1', start, now, [
        { setType: 'working', weight: 50, reps: 10, completed: true },
      ]);

      prisma.workout.findFirst
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(null);

      prisma.workout.findMany.mockResolvedValueOnce([]);

      const summary = await service.summary('u1', 'w1');
      expect(summary.totalVolume).toBe(500);
      expect(summary.volumeChangeVsPrevious).toBeNull();
      expect(summary.volumePercentageChangeVsPrevious).toBeNull();
      expect(summary.exerciseDeltas[0].displayText).toBe('First time logged');
    });
  });

  describe('list and exerciseHistory', () => {
    it('filters list by status when provided', async () => {
      prisma.workout.findMany.mockResolvedValueOnce([]);
      await service.list('u1', 'completed', 20, 0);

      expect(prisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'u1',
            deletedAt: null,
            status: 'completed',
          },
          take: 20,
          skip: 0,
        }),
      );
    });

    it('queries exerciseHistory for up to requested limit', async () => {
      prisma.workout.findMany.mockResolvedValueOnce([]);
      await service.exerciseHistory('u1', 'ex1', 5, 'w-current');

      expect(prisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'u1',
            deletedAt: null,
            status: 'completed',
            id: { not: 'w-current' },
            exercises: { some: { exerciseId: 'ex1', deletedAt: null } },
          },
          take: 5,
          orderBy: { completedAt: 'desc' },
        }),
      );
    });
  });
});
