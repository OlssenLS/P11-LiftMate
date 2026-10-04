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
) {
  return {
    id,
    userId: 'u1',
    name: 'Push day',
    note: null,
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
        exercise: null,
        sets: sets.map((s, i) => ({
          id: `set-${id}-${i}`,
          workoutExerciseId: 'we1',
          position: i,
          setType: s.setType,
          weight: s.weight,
          weightUnit: 'kg',
          reps: s.reps,
          rir: null,
          completed: s.completed,
          createdAt: startedAt,
          updatedAt: startedAt,
          deletedAt: null,
        })),
      },
    ],
  };
}

describe('WorkoutsService.summary', () => {
  let service: WorkoutsService;
  const prisma = {
    workout: {
      findFirst: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkoutsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(WorkoutsService);
  });

  it('computes volume from working sets only and change vs previous', async () => {
    // getById -> current workout (2 working + 1 warmup; one working set incomplete)
    const current = workoutRow('w2', start, now, [
      { setType: 'warmup', weight: 60, reps: 10, completed: true }, // excluded
      { setType: 'working', weight: 100, reps: 5, completed: true }, // 500
      { setType: 'working', weight: 100, reps: 5, completed: true }, // 500
      { setType: 'working', weight: 100, reps: 5, completed: false }, // excluded (incomplete)
    ]);
    // previous completed workout -> total working volume 800
    const previous = workoutRow('w1', new Date('2026-01-01T09:00:00Z'), new Date('2026-01-01T10:00:00Z'), [
      { setType: 'working', weight: 80, reps: 5, completed: true }, // 400
      { setType: 'working', weight: 80, reps: 5, completed: true }, // 400
    ]);

    prisma.workout.findFirst
      .mockResolvedValueOnce(current) // getById inside summary
      .mockResolvedValueOnce(previous); // previous-workout lookup

    const summary = await service.summary('u1', 'w2');

    expect(summary.totalVolume).toBe(1000); // 500 + 500, warmup & incomplete excluded
    expect(summary.totalWorkingSets).toBe(2);
    expect(summary.totalSets).toBe(4);
    expect(summary.exerciseCount).toBe(1);
    expect(summary.durationSeconds).toBe(3600);
    expect(summary.volumeChangeVsPrevious).toBe(200); // 1000 - 800
  });

  it('reports null change when there is no previous workout', async () => {
    const current = workoutRow('w1', start, now, [
      { setType: 'working', weight: 50, reps: 10, completed: true }, // 500
    ]);
    prisma.workout.findFirst
      .mockResolvedValueOnce(current) // getById
      .mockResolvedValueOnce(null); // no previous

    const summary = await service.summary('u1', 'w1');
    expect(summary.totalVolume).toBe(500);
    expect(summary.volumeChangeVsPrevious).toBeNull();
  });
});
