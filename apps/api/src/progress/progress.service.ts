import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  calculateEstimated1RM,
  type BodyWeightLog,
  type CreateBodyWeightLogInput,
  type WeightProgressSummary,
  type ExerciseStrengthProgress,
  type VolumeProgressSummary,
  type ConsistencyProgressSummary,
  type ProgressOverview,
} from '@liftmate/shared';
import { randomUUID } from 'node:crypto';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get body weight tracking history and progress metrics.
   */
  async getWeightProgress(userId: string): Promise<WeightProgressSummary> {
    const [user, logs] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { weightKg: true, targetWeightKg: true, createdAt: true },
      }),
      this.prisma.bodyWeightLog.findMany({
        where: { userId, deletedAt: null },
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    if (logs.length === 0) {
      return {
        currentWeightKg: user.weightKg ?? null,
        startWeightKg: user.weightKg ?? null,
        targetWeightKg: user.targetWeightKg ?? null,
        changeThisMonthKg: null,
        history: [],
        sparkline: user.weightKg ? [user.weightKg] : [],
      };
    }

    const currentWeightKg = Number(logs[logs.length - 1].weightKg);
    const startWeightKg = Number(logs[0].weightKg);
    const targetWeightKg = user.targetWeightKg ?? null;

    // Weight 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthAgoLog = [...logs].reverse().find((l) => l.loggedAt <= thirtyDaysAgo);
    const baselineWeight = monthAgoLog ? Number(monthAgoLog.weightKg) : startWeightKg;
    const changeThisMonthKg = Math.round((currentWeightKg - baselineWeight) * 10) / 10;

    const history = logs.map((l) => ({
      id: l.id,
      date: l.loggedAt.toISOString().split('T')[0],
      weightKg: Number(l.weightKg),
      notes: l.notes,
    }));

    // Last 10 weight points for sparkline
    const sparkline = logs.slice(-10).map((l) => Number(l.weightKg));

    return {
      currentWeightKg,
      startWeightKg,
      targetWeightKg,
      changeThisMonthKg,
      history,
      sparkline,
    };
  }

  /**
   * Log a new body weight measurement and update user's profile weight.
   */
  async logWeight(userId: string, input: CreateBodyWeightLogInput): Promise<BodyWeightLog> {
    const id = input.id ?? randomUUID();
    const loggedAt = input.loggedAt ? new Date(input.loggedAt) : new Date();

    const [log] = await this.prisma.$transaction([
      this.prisma.bodyWeightLog.upsert({
        where: { id },
        update: {
          weightKg: input.weightKg,
          loggedAt,
          notes: input.notes ?? null,
          deletedAt: null,
        },
        create: {
          id,
          userId,
          weightKg: input.weightKg,
          loggedAt,
          notes: input.notes ?? null,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { weightKg: input.weightKg },
      }),
    ]);

    return {
      id: log.id,
      userId: log.userId,
      weightKg: Number(log.weightKg),
      loggedAt: log.loggedAt,
      notes: log.notes,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      deletedAt: log.deletedAt,
    };
  }

  /**
   * Get per-exercise strength progression and estimated 1RM history.
   */
  async getStrengthProgress(userId: string, exerciseId: string): Promise<ExerciseStrengthProgress> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, name: true },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise with id ${exerciseId} not found`);
    }

    const sets = await this.prisma.workoutSet.findMany({
      where: {
        completed: true,
        deletedAt: null,
        workoutExercise: {
          exerciseId,
          workout: {
            userId,
            status: 'completed',
            deletedAt: null,
          },
        },
      },
      include: {
        workoutExercise: {
          include: {
            workout: {
              select: { startedAt: true },
            },
          },
        },
      },
      orderBy: {
        workoutExercise: {
          workout: {
            startedAt: 'asc',
          },
        },
      },
    });

    if (sets.length === 0) {
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        bestWeight: 0,
        bestReps: 0,
        maxEstimated1Rm: 0,
        history: [],
      };
    }

    // Group sets by session date
    const sessionMap = new Map<string, { weight: number; reps: number; estimated1Rm: number }>();
    let bestWeight = 0;
    let bestReps = 0;
    let maxEstimated1Rm = 0;

    for (const set of sets) {
      const weight = Number(set.weight);
      const reps = set.reps;
      const est1Rm = calculateEstimated1RM(weight, reps);
      const dateStr = set.workoutExercise.workout.startedAt.toISOString().split('T')[0];

      if (weight > bestWeight) {
        bestWeight = weight;
        bestReps = reps;
      }
      if (est1Rm > maxEstimated1Rm) {
        maxEstimated1Rm = est1Rm;
      }

      const existing = sessionMap.get(dateStr);
      if (!existing || est1Rm > existing.estimated1Rm) {
        sessionMap.set(dateStr, { weight, reps, estimated1Rm: est1Rm });
      }
    }

    const history = Array.from(sessionMap.entries()).map(([date, data]) => ({
      date,
      weight: data.weight,
      reps: data.reps,
      estimated1Rm: data.estimated1Rm,
    }));

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      bestWeight,
      bestReps,
      maxEstimated1Rm,
      history,
    };
  }

  /**
   * Get training volume progression by range (week or month) and muscle group distribution.
   */
  async getVolumeProgress(userId: string, range: 'week' | 'month' = 'week'): Promise<VolumeProgressSummary> {
    const days = range === 'month' ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const workouts = await this.prisma.workout.findMany({
      where: {
        userId,
        status: 'completed',
        deletedAt: null,
        startedAt: { gte: since },
      },
      include: {
        exercises: {
          where: { deletedAt: null },
          include: {
            exercise: { select: { primaryMuscle: true } },
            sets: {
              where: { completed: true, deletedAt: null },
              select: { weight: true, reps: true },
            },
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    let totalVolumeKg = 0;
    const muscleMap = new Map<string, number>();
    const dateVolumeMap = new Map<string, number>();

    for (const w of workouts) {
      const dateStr = w.startedAt.toISOString().split('T')[0];
      let workoutVol = 0;

      for (const we of w.exercises) {
        const muscle = we.exercise.primaryMuscle;
        for (const s of we.sets) {
          const vol = Number(s.weight) * s.reps;
          workoutVol += vol;
          muscleMap.set(muscle, (muscleMap.get(muscle) ?? 0) + vol);
        }
      }

      totalVolumeKg += workoutVol;
      dateVolumeMap.set(dateStr, (dateVolumeMap.get(dateStr) ?? 0) + workoutVol);
    }

    // Format by muscle group with percentage
    const byMuscleGroup = Array.from(muscleMap.entries()).map(([muscleGroup, vol]) => ({
      muscleGroup,
      volumeKg: Math.round(vol),
      percentage: totalVolumeKg > 0 ? Math.round((vol / totalVolumeKg) * 100) : 0,
    })).sort((a, b) => b.volumeKg - a.volumeKg);

    const history = Array.from(dateVolumeMap.entries()).map(([label, vol]) => ({
      label,
      volumeKg: Math.round(vol),
    }));

    const sparkline = history.map((h) => h.volumeKg);

    return {
      totalVolumeKg: Math.round(totalVolumeKg),
      range,
      history,
      byMuscleGroup,
      sparkline: sparkline.length > 0 ? sparkline : [0],
    };
  }

  /**
   * Get workout consistency and adherence against planned program frequency.
   */
  async getConsistencyProgress(userId: string): Promise<ConsistencyProgressSummary> {
    const [prefs, currentProgram] = await Promise.all([
      this.prisma.userPreferences.findUnique({
        where: { userId },
        select: { weeklyFrequency: true },
      }),
      this.prisma.program.findFirst({
        where: { userId, status: 'active', deletedAt: null },
        select: { frequency: true },
      }),
    ]);

    const plannedSessions = currentProgram?.frequency ?? prefs?.weeklyFrequency ?? 4;

    // 4 weeks window (28 days)
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const workouts = await this.prisma.workout.findMany({
      where: {
        userId,
        status: 'completed',
        deletedAt: null,
        startedAt: { gte: fourWeeksAgo },
      },
      select: { startedAt: true },
      orderBy: { startedAt: 'asc' },
    });

    // Bucket into 4 weekly intervals: Week -3, Week -2, Week -1, This Week
    const weekBuckets = [
      { weekLabel: '3 weeks ago', completed: 0, planned: plannedSessions },
      { weekLabel: '2 weeks ago', completed: 0, planned: plannedSessions },
      { weekLabel: 'Last week', completed: 0, planned: plannedSessions },
      { weekLabel: 'This week', completed: 0, planned: plannedSessions },
    ];

    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const nowMs = now.getTime();

    for (const w of workouts) {
      const diffMs = nowMs - w.startedAt.getTime();
      const weekIndexFromNow = Math.floor(diffMs / oneWeekMs);
      if (weekIndexFromNow >= 0 && weekIndexFromNow < 4) {
        const bucketIndex = 3 - weekIndexFromNow;
        weekBuckets[bucketIndex].completed += 1;
      }
    }

    const currentWeekCompleted = weekBuckets[3].completed;
    const consistencyPct = plannedSessions > 0
      ? Math.min(100, Math.round((currentWeekCompleted / plannedSessions) * 100))
      : 0;

    // Streak calculation (consecutive weeks with completed >= planned)
    let streakWeeks = 0;
    for (let i = 3; i >= 0; i--) {
      if (weekBuckets[i].completed >= weekBuckets[i].planned) {
        streakWeeks += 1;
      } else {
        break;
      }
    }

    return {
      completedSessions: currentWeekCompleted,
      plannedSessions,
      consistencyPct,
      streakWeeks,
      weeklyBreakdown: weekBuckets,
    };
  }

  /**
   * Aggregated progress overview for Home Screen and metric summaries.
   */
  async getSummary(userId: string): Promise<ProgressOverview> {
    const [weight, volume, consistency, topPrs] = await Promise.all([
      this.getWeightProgress(userId),
      this.getVolumeProgress(userId, 'week'),
      this.getConsistencyProgress(userId),
      this.getTopPrs(userId),
    ]);

    return {
      weight,
      volume,
      consistency,
      topPrs,
    };
  }

  private async getTopPrs(userId: string): Promise<ExerciseStrengthProgress[]> {
    // Find top 3 most frequently logged completed exercises
    const topExercises = await this.prisma.workoutExercise.groupBy({
      by: ['exerciseId'],
      where: {
        workout: {
          userId,
          status: 'completed',
          deletedAt: null,
        },
      },
      _count: { exerciseId: true },
      orderBy: { _count: { exerciseId: 'desc' } },
      take: 3,
    });

    const prs: ExerciseStrengthProgress[] = [];
    for (const te of topExercises) {
      try {
        const sp = await this.getStrengthProgress(userId, te.exerciseId);
        prs.push(sp);
      } catch {
        // Skip if not found
      }
    }

    return prs;
  }
}
