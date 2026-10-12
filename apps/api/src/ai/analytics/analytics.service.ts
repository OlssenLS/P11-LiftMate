import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AI_PROVIDER, type AiProvider } from '../provider/ai-provider.interface.js';
import { AiRateLimiterService } from '../ai-rate-limiter.service.js';
import {
  AiInsight,
  AiInsightAction,
  AnalyticsOverviewResponse,
  AnalyticsSufficiency,
  StructuredAnalyticsMetrics,
} from '@liftmate/shared';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly rateLimiter: AiRateLimiterService,
  ) {}

  /**
   * Evaluates data sufficiency per Spec §54.
   * Requires at least 3 completed workouts and 3 logged nutrition days.
   */
  async checkSufficiency(userId: string): Promise<AnalyticsSufficiency> {
    const minWorkouts = 3;
    const minNutritionDays = 3;

    const [workoutCount, foodLogs, weightLogsCount] = await Promise.all([
      this.prisma.workout.count({
        where: {
          userId,
          status: 'completed',
          deletedAt: null,
        },
      }),
      this.prisma.foodLog.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          loggedAt: true,
        },
      }),
      this.prisma.bodyWeightLog.count({
        where: {
          userId,
          deletedAt: null,
        },
      }),
    ]);

    const uniqueDays = new Set(foodLogs.map((fl) => fl.loggedAt.toISOString().split('T')[0]));
    const nutritionDaysCount = uniqueDays.size;
    const isSufficient = workoutCount >= minWorkouts && nutritionDaysCount >= minNutritionDays;

    return {
      isSufficient,
      workoutCount,
      nutritionDaysCount,
      weightLogsCount,
      minimumWorkoutsRequired: minWorkouts,
      minimumNutritionDaysRequired: minNutritionDays,
      message: isSufficient
        ? 'Sufficient training and nutrition data available.'
        : 'Complete at least several workout and nutrition entries before generating a meaningful trend analysis.',
    };
  }

  /**
   * Deterministically calculates structured metrics from raw DB rows (Spec §51).
   */
  async calculateMetrics(userId: string): Promise<StructuredAnalyticsMetrics> {
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [user, workouts, foodLogs, bodyWeightLogs] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { preferences: true },
      }),
      this.prisma.workout.findMany({
        where: {
          userId,
          status: 'completed',
          startedAt: { gte: fourWeeksAgo },
          deletedAt: null,
        },
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: {
                where: { completed: true },
              },
            },
          },
        },
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.foodLog.findMany({
        where: {
          userId,
          loggedAt: { gte: fourWeeksAgo },
          deletedAt: null,
        },
      }),
      this.prisma.bodyWeightLog.findMany({
        where: {
          userId,
          loggedAt: { gte: fourWeeksAgo },
          deletedAt: null,
        },
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    // Workouts & Adherence
    const workoutsCompleted = workouts.length;
    const weeklyFreq = user?.preferences?.weeklyFrequency ?? 3;
    const plannedSessions = weeklyFreq * 4;
    const adherencePct =
      plannedSessions > 0 ? Math.min(100, Math.round((workoutsCompleted / plannedSessions) * 100)) : 0;

    // Volume calculation (working sets only)
    let totalVolumeKg = 0;
    let period1VolumeKg = 0;
    let period2VolumeKg = 0;
    let totalRir = 0;
    let rirCount = 0;

    // Map exercise history: exerciseId -> { name, sessions: [{ date, topWeight, volume, reps, est1Rm }] }
    const exerciseHistoryMap = new Map<
      string,
      {
        name: string;
        sessions: Array<{ date: Date; topWeight: number; reps: number; volume: number; est1Rm: number }>;
      }
    >();

    for (const w of workouts) {
      let sessionVolume = 0;
      const isPeriod2 = w.startedAt >= twoWeeksAgo;

      for (const we of w.exercises) {
        let exTopWeight = 0;
        let exTopReps = 0;
        let exEst1Rm = 0;
        let exVolume = 0;

        for (const s of we.sets) {
          if (s.setType === 'working' || s.setType === null) {
            const weightVal = Number(s.weight ?? 0);
            const setVol = weightVal * (s.reps ?? 0);
            exVolume += setVol;
            sessionVolume += setVol;

            if (weightVal > exTopWeight) {
              exTopWeight = weightVal;
              exTopReps = s.reps ?? 0;
            }
            if (weightVal > 0 && s.reps) {
              const e1rm = Math.round(weightVal * (1 + s.reps / 30));
              if (e1rm > exEst1Rm) exEst1Rm = e1rm;
            }

            if (s.rir !== null && s.rir !== undefined) {
              totalRir += s.rir;
              rirCount++;
            }
          }
        }

        if (exVolume > 0 || exTopWeight > 0) {
          if (!exerciseHistoryMap.has(we.exerciseId)) {
            exerciseHistoryMap.set(we.exerciseId, {
              name: we.exercise.name,
              sessions: [],
            });
          }
          exerciseHistoryMap.get(we.exerciseId)!.sessions.push({
            date: w.startedAt,
            topWeight: exTopWeight,
            reps: exTopReps,
            volume: exVolume,
            est1Rm: exEst1Rm,
          });
        }
      }

      totalVolumeKg += sessionVolume;
      if (isPeriod2) {
        period2VolumeKg += sessionVolume;
      } else {
        period1VolumeKg += sessionVolume;
      }
    }

    const averageWeeklyVolumeKg = Math.round(totalVolumeKg / 4);
    let volumeDeltaPct: number | null = null;
    if (period1VolumeKg > 0) {
      volumeDeltaPct = Math.round(((period2VolumeKg - period1VolumeKg) / period1VolumeKg) * 100);
    }

    const averageRir = rirCount > 0 ? Number((totalRir / rirCount).toFixed(1)) : null;

    // Detect progressing and stagnant exercises
    const topProgressingExercises: Array<{ exerciseName: string; deltaKg: number; best1Rm: number }> = [];
    const stagnantExercises: Array<{ exerciseName: string; sessionsCount: number; currentLoadKg: number }> = [];

    for (const [, exData] of exerciseHistoryMap.entries()) {
      if (exData.sessions.length >= 3) {
        const lastSessions = exData.sessions.slice(-4);
        const firstLoad = lastSessions[0].topWeight;
        const lastLoad = lastSessions[lastSessions.length - 1].topWeight;
        const best1Rm = Math.max(...lastSessions.map((s) => s.est1Rm));

        // Check if load remained identical across 3+ consecutive sessions
        const isStagnant = lastSessions.every((s) => s.topWeight === lastLoad && lastLoad > 0);
        if (isStagnant) {
          stagnantExercises.push({
            exerciseName: exData.name,
            sessionsCount: lastSessions.length,
            currentLoadKg: lastLoad,
          });
        } else if (lastLoad > firstLoad) {
          topProgressingExercises.push({
            exerciseName: exData.name,
            deltaKg: Number((lastLoad - firstLoad).toFixed(1)),
            best1Rm,
          });
        }
      }
    }

    // Nutrition aggregations
    const foodByDay = new Map<string, { calories: number; protein: number }>();
    for (const fl of foodLogs) {
      const dayKey = fl.loggedAt.toISOString().split('T')[0];
      const current = foodByDay.get(dayKey) ?? { calories: 0, protein: 0 };
      current.calories += Number(fl.calories);
      current.protein += Number(fl.protein);
      foodByDay.set(dayKey, current);
    }

    const loggedDays = foodByDay.size;
    let totalCals = 0;
    let totalProtein = 0;
    for (const day of foodByDay.values()) {
      totalCals += day.calories;
      totalProtein += day.protein;
    }

    const averageDailyCalories = loggedDays > 0 ? Math.round(totalCals / loggedDays) : 0;
    const averageDailyProteinGrams = loggedDays > 0 ? Math.round(totalProtein / loggedDays) : 0;

    const targetCalories = user?.preferences?.targetCalories ?? null;
    const targetProteinGrams = user?.preferences?.targetProtein ?? null;

    const calorieAdherencePct =
      targetCalories && targetCalories > 0 ? Math.round((averageDailyCalories / targetCalories) * 100) : null;
    const proteinAdherencePct =
      targetProteinGrams && targetProteinGrams > 0
        ? Math.round((averageDailyProteinGrams / targetProteinGrams) * 100)
        : null;

    // Weight change
    let weightChangeKg: number | null = null;
    if (bodyWeightLogs.length >= 2) {
      const firstWeight = Number(bodyWeightLogs[0].weightKg);
      const latestWeight = Number(bodyWeightLogs[bodyWeightLogs.length - 1].weightKg);
      weightChangeKg = Number((latestWeight - firstWeight).toFixed(1));
    } else if (bodyWeightLogs.length === 1 && user?.weightKg) {
      weightChangeKg = Number((Number(bodyWeightLogs[0].weightKg) - user.weightKg).toFixed(1));
    }

    return {
      timeframeWeeks: 4,
      workoutsCompleted,
      plannedSessions,
      adherencePct,
      averageWeeklyVolumeKg,
      volumeDeltaPct,
      averageDailyCalories,
      targetCalories,
      calorieAdherencePct,
      averageDailyProteinGrams,
      targetProteinGrams,
      proteinAdherencePct,
      averageRir,
      weightChangeKg,
      topProgressingExercises,
      stagnantExercises,
    };
  }

  /**
   * Retrieves overall analytics overview for user.
   */
  async getOverview(userId: string): Promise<AnalyticsOverviewResponse> {
    const sufficiency = await this.checkSufficiency(userId);

    if (!sufficiency.isSufficient) {
      return {
        sufficiency,
        metrics: null,
        insights: [],
        primaryInsight: null,
      };
    }

    const metrics = await this.calculateMetrics(userId);

    // Fetch existing recent active insights (last 14 days)
    const existingInsights = await this.prisma.aiInsight.findMany({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    if (existingInsights.length === 0) {
      // Auto-generate if none exist
      return this.generateInsights(userId, false);
    }

    const insights = existingInsights.map((i) => this.mapInsightToDto(i));
    const primaryInsight = insights[0] ?? null;

    return {
      sufficiency,
      metrics,
      insights,
      primaryInsight,
    };
  }

  /**
   * Generates or refreshes insights using AI Provider or deterministic fallback engine.
   */
  async generateInsights(userId: string, _forceRefresh = false): Promise<AnalyticsOverviewResponse> {
    const sufficiency = await this.checkSufficiency(userId);

    if (!sufficiency.isSufficient) {
      return {
        sufficiency,
        metrics: null,
        insights: [],
        primaryInsight: null,
      };
    }

    const metrics = await this.calculateMetrics(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });

    let rawInsightItems: Array<{
      category:
        | 'training_volume'
        | 'progressive_overload'
        | 'recovery_fatigue'
        | 'nutrition_protein'
        | 'consistency_streak';
      title: string;
      observation: string;
      evidence: string;
      possibleFactors: string[];
      recommendation: string;
      action: AiInsightAction;
      confidence: 'high' | 'medium' | 'low';
    }> = [];

    // Attempt AI generation if available and not rate limited
    let isRateLimited = false;
    try {
      await this.rateLimiter.checkAndIncrement(userId);
    } catch {
      isRateLimited = true;
    }

    if (!isRateLimited) {
      try {
        const prompt = this.buildPrompt(metrics, user);
        const result = await this.aiProvider.generate({
          system:
            'You are the LiftMate AI Analytics Engine. Analyze structured lifter metrics and output structured insights following Spec §50–§57. Strictly follow: 1. Base observations strictly on provided numbers. 2. Distinguish fact from inference. 3. Never claim causation ("may be one factor"). 4. No medical diagnosis. Output only valid JSON.',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          maxTokens: 1500,
        });

        const cleanJson = result.content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed.insights) && parsed.insights.length > 0) {
          rawInsightItems = parsed.insights;
        }
      } catch (err: any) {
        this.logger.warn(`AI Analytics generation fallback triggered: ${err?.message || err}`);
      }
    }

    // Fallback to deterministic rules if AI was empty or failed
    if (rawInsightItems.length === 0) {
      rawInsightItems = this.fallbackGenerateInsights(metrics, user);
    }

    // Persist insights transactionally
    const savedInsights = await this.prisma.$transaction(
      rawInsightItems.map((item) =>
        this.prisma.aiInsight.create({
          data: {
            userId,
            category: item.category,
            title: item.title,
            observation: item.observation,
            evidence: item.evidence,
            possibleFactors: item.possibleFactors,
            recommendation: item.recommendation,
            confidence: item.confidence,
            dataWindowStart: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
            dataWindowEnd: new Date(),
          },
        })
      )
    );

    const insights = savedInsights.map((i, idx) =>
      this.mapInsightToDto(i, rawInsightItems[idx]?.action ?? 'ask_coach')
    );

    return {
      sufficiency,
      metrics,
      insights,
      primaryInsight: insights[0] ?? null,
    };
  }

  /**
   * Deterministic rule-based insight generator (Spec §52, §53, §55).
   */
  fallbackGenerateInsights(
    metrics: StructuredAnalyticsMetrics,
    _user: any
  ): Array<{
    category:
      | 'training_volume'
      | 'progressive_overload'
      | 'recovery_fatigue'
      | 'nutrition_protein'
      | 'consistency_streak';
    title: string;
    observation: string;
    evidence: string;
    possibleFactors: string[];
    recommendation: string;
    action: AiInsightAction;
    confidence: 'high' | 'medium' | 'low';
  }> {
    const list: Array<{
      category:
        | 'training_volume'
        | 'progressive_overload'
        | 'recovery_fatigue'
        | 'nutrition_protein'
        | 'consistency_streak';
      title: string;
      observation: string;
      evidence: string;
      possibleFactors: string[];
      recommendation: string;
      action: AiInsightAction;
      confidence: 'high' | 'medium' | 'low';
    }> = [];

    // Rule 1: Stagnant exercise progression (§52 & §56)
    if (metrics.stagnantExercises.length > 0) {
      const stag = metrics.stagnantExercises[0];
      list.push({
        category: 'progressive_overload',
        title: `${stag.exerciseName} Progress Has Slowed`,
        observation: `${stag.exerciseName} load has remained around ${stag.currentLoadKg} kg across ${stag.sessionsCount} sessions.`,
        evidence: `Logged at ${stag.currentLoadKg} kg across ${stag.sessionsCount} consecutive sessions without weight progression.`,
        possibleFactors: [
          'Training volume has remained unchanged.',
          'Rep target or rest interval may need adjustment.',
          'Fatigue accumulation or caloric intake may be a contributing factor.',
        ],
        recommendation:
          'Review progression strategy, consider micro-loading (+1 to +2.5 kg), or adjust target rep range.',
        action: 'ask_coach',
        confidence: 'high',
      });
    }

    // Rule 2: Cross-analysis: High consistency + stagnant lifting + low protein (§53 & §56)
    if (
      metrics.adherencePct >= 70 &&
      metrics.proteinAdherencePct !== null &&
      metrics.proteinAdherencePct < 85
    ) {
      list.push({
        category: 'recovery_fatigue',
        title: 'Training Consistency vs Protein Adherence',
        observation: `Training adherence is strong (${metrics.adherencePct}%), but daily protein is at ${metrics.averageDailyProteinGrams} g vs ${metrics.targetProteinGrams} g target (${metrics.proteinAdherencePct}%).`,
        evidence: `Completed ${metrics.workoutsCompleted} sessions across 4 weeks with ${metrics.proteinAdherencePct}% protein compliance.`,
        possibleFactors: [
          'Low protein adherence may be one factor worth reviewing alongside your training consistency.',
          'Meal timing around training sessions.',
        ],
        recommendation:
          'Increase lean protein distribution across meals to support recovery and muscle protein synthesis.',
        action: 'ask_coach',
        confidence: 'medium',
      });
    }

    // Rule 3: Training Volume Trend
    if (metrics.volumeDeltaPct !== null && Math.abs(metrics.volumeDeltaPct) >= 10) {
      const isUp = metrics.volumeDeltaPct > 0;
      list.push({
        category: 'training_volume',
        title: isUp ? 'Weekly Training Volume Trending Up' : 'Weekly Training Volume Decreased',
        observation: `Training volume ${isUp ? 'increased' : 'decreased'} by ${Math.abs(metrics.volumeDeltaPct)}% to an average of ${metrics.averageWeeklyVolumeKg} kg/week.`,
        evidence: `Comparison of completed working sets over the last 2 weeks vs previous 2 weeks.`,
        possibleFactors: [
          isUp
            ? 'Progressive overload across working sets and additional logged exercises.'
            : 'Fewer sessions or reduced sets completed in recent workouts.',
        ],
        recommendation: isUp
          ? 'Maintain progression while monitoring recovery and set RIR.'
          : 'Review workout schedule to restore baseline volume target.',
        action: isUp ? 'none' : 'review_plan',
        confidence: 'high',
      });
    }

    // Rule 4: Consistency Streak (§53)
    if (metrics.adherencePct >= 80) {
      list.push({
        category: 'consistency_streak',
        title: 'High Workout Consistency',
        observation: `You achieved ${metrics.adherencePct}% training adherence over the past 4 weeks.`,
        evidence: `${metrics.workoutsCompleted} completed workouts against ${metrics.plannedSessions} planned sessions.`,
        possibleFactors: ['Consistent scheduling and routine adherence.'],
        recommendation: 'Keep up this momentum and prioritize adequate sleep and recovery between sessions.',
        action: 'none',
        confidence: 'high',
      });
    }

    // Fallback if none matched
    if (list.length === 0) {
      list.push({
        category: 'progressive_overload',
        title: 'Training Performance Baseline Established',
        observation: `Average weekly volume is ${metrics.averageWeeklyVolumeKg} kg across ${metrics.workoutsCompleted} completed workouts.`,
        evidence: `Tracked over 4 weeks with ${metrics.adherencePct}% schedule consistency.`,
        possibleFactors: ['Regular baseline logging.'],
        recommendation: 'Continue tracking working set weights and RIR to detect strength trends.',
        action: 'ask_coach',
        confidence: 'medium',
      });
    }

    return list;
  }

  private buildPrompt(metrics: StructuredAnalyticsMetrics, user: any): string {
    return JSON.stringify({
      request: 'Generate structured fitness analytics insights for user per Spec §50–§57',
      user: {
        goal: user?.preferences?.primaryGoal ?? 'build_muscle',
        experience: user?.preferences?.experienceLevel ?? 'intermediate',
        weeklyFrequency: user?.preferences?.weeklyFrequency ?? 3,
      },
      metrics,
      expectedJsonFormat: {
        insights: [
          {
            category: 'progressive_overload',
            title: 'Bench Press Progress Has Slowed',
            observation: 'Bench press load has remained at 75 kg across 4 sessions.',
            evidence: 'Previous 4 sessions: 75 x 8, 75 x 8, 75 x 7, 75 x 7',
            possibleFactors: ['Training volume has remained unchanged.'],
            recommendation: 'Review progression strategy and consider micro-loading.',
            action: 'ask_coach',
            confidence: 'high',
          },
        ],
      },
    });
  }

  private mapInsightToDto(i: any, defaultAction: AiInsightAction = 'ask_coach'): AiInsight {
    let action: AiInsightAction = defaultAction;
    if (i.category === 'training_volume' && i.title.toLowerCase().includes('decreased')) {
      action = 'review_plan';
    }

    return {
      id: i.id,
      userId: i.userId,
      category: i.category,
      title: i.title,
      observation: i.observation,
      evidence: i.evidence,
      possibleFactors: i.possibleFactors ?? [],
      recommendation: i.recommendation,
      action,
      confidence: i.confidence,
      dataWindowStart: i.dataWindowStart ? i.dataWindowStart.toISOString() : null,
      dataWindowEnd: i.dataWindowEnd ? i.dataWindowEnd.toISOString() : null,
      createdAt: i.createdAt.toISOString(),
    };
  }
}
