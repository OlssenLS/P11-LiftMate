import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface CoachContextData {
  user: {
    displayName: string;
    age?: number;
    gender?: string;
    heightCm?: number;
    weightKg?: number;
    targetWeightKg?: number;
    primaryGoal?: string;
    secondaryGoal?: string;
    experienceLevel?: string;
    trainingLocation?: string;
    equipment: string[];
    nutritionTargets: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    };
  };
  activeProgram?: {
    name: string;
    frequency: number;
    goal: string;
  };
  recentWorkouts: Array<{
    name: string;
    date: string;
    volumeKg: number;
    exercises: Array<{
      name: string;
      setsCount: number;
      topWeightKg: number;
      avgRir?: number;
    }>;
  }>;
  todayNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealsCount: number;
  };
  weightProgress?: {
    currentKg?: number;
    changeThisMonthKg?: number;
  };
  topPersonalRecords: Array<{
    exerciseName: string;
    maxWeightKg: number;
    maxReps: number;
    estimated1RmKg: number;
  }>;
}

@Injectable()
export class CoachContextService {
  constructor(private readonly prisma: PrismaService) {}

  async buildContext(userId: string): Promise<CoachContextData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        equipment: true,
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    let age: number | undefined;
    if (user.dateOfBirth) {
      const diffMs = Date.now() - new Date(user.dateOfBirth).getTime();
      age = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
    }

    // Active program
    const activeProgram = await this.prisma.program.findFirst({
      where: {
        userId,
        status: 'active',
        deletedAt: null,
      },
    });

    // Recent workouts (last 3)
    const recentWorkoutsRaw = await this.prisma.workout.findMany({
      where: {
        userId,
        status: 'completed',
        deletedAt: null,
      },
      orderBy: { startedAt: 'desc' },
      take: 3,
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    const recentWorkouts = recentWorkoutsRaw.map((w) => {
      let workoutVolume = 0;
      const exercises = w.exercises.map((we) => {
        let topWeight = 0;
        let rirSum = 0;
        let rirCount = 0;

        for (const s of we.sets) {
          if (s.setType === 'working') {
            const wt = Number(s.weight);
            workoutVolume += wt * s.reps;
            if (wt > topWeight) topWeight = wt;
            if (s.rir !== null && !s.rirUnknown) {
              rirSum += s.rir;
              rirCount++;
            }
          }
        }

        return {
          name: we.exercise.name,
          setsCount: we.sets.filter((s) => s.setType === 'working').length,
          topWeightKg: topWeight,
          avgRir: rirCount > 0 ? Number((rirSum / rirCount).toFixed(1)) : undefined,
        };
      });

      return {
        name: w.name || 'Workout Session',
        date: w.startedAt.toISOString().split('T')[0],
        volumeKg: Math.round(workoutVolume),
        exercises,
      };
    });

    // Today's nutrition
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayLogs = await this.prisma.foodLog.findMany({
      where: {
        userId,
        loggedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        deletedAt: null,
      },
    });

    let todayCal = 0;
    let todayProt = 0;
    let todayCarb = 0;
    let todayFat = 0;

    for (const log of todayLogs) {
      todayCal += Number(log.calories);
      todayProt += Number(log.protein);
      todayCarb += Number(log.carbs);
      todayFat += Number(log.fat);
    }

    // Weight progress
    const weightLogs = await this.prisma.bodyWeightLog.findMany({
      where: { userId, deletedAt: null },
      orderBy: { loggedAt: 'desc' },
      take: 10,
    });

    let currentKg = user.weightKg ? Number(user.weightKg) : undefined;
    if (weightLogs.length > 0) {
      currentKg = Number(weightLogs[0].weightKg);
    }

    let changeThisMonthKg: number | undefined;
    if (weightLogs.length > 1) {
      const oldestInWindow = weightLogs[weightLogs.length - 1];
      changeThisMonthKg = Number(
        (currentKg! - Number(oldestInWindow.weightKg)).toFixed(1),
      );
    }

    // Top PRs
    const prsRaw = await this.prisma.exercisePersonalRecord.findMany({
      where: { userId },
      include: { exercise: true },
      orderBy: { maxWeight: 'desc' },
      take: 4,
    });

    const topPersonalRecords = prsRaw.map((pr) => ({
      exerciseName: pr.exercise.name,
      maxWeightKg: Number(pr.maxWeight),
      maxReps: pr.maxReps,
      estimated1RmKg: Number(pr.maxEstimated1Rm),
    }));

    return {
      user: {
        displayName: user.displayName,
        age,
        gender: user.gender || undefined,
        heightCm: user.heightCm || undefined,
        weightKg: currentKg,
        targetWeightKg: user.targetWeightKg || undefined,
        primaryGoal: user.preferences?.primaryGoal || undefined,
        secondaryGoal: user.preferences?.secondaryGoal || undefined,
        experienceLevel: user.preferences?.experienceLevel || undefined,
        trainingLocation: user.trainingLocation || undefined,
        equipment: user.equipment.map((e) => e.equipment),
        nutritionTargets: {
          calories: user.preferences?.targetCalories || undefined,
          protein: user.preferences?.targetProtein || undefined,
          carbs: user.preferences?.targetCarbs || undefined,
          fat: user.preferences?.targetFat || undefined,
        },
      },
      activeProgram: activeProgram
        ? {
            name: activeProgram.name,
            frequency: activeProgram.frequency,
            goal: activeProgram.goal,
          }
        : undefined,
      recentWorkouts,
      todayNutrition: {
        calories: Math.round(todayCal),
        protein: Math.round(todayProt),
        carbs: Math.round(todayCarb),
        fat: Math.round(todayFat),
        mealsCount: todayLogs.length,
      },
      weightProgress: {
        currentKg,
        changeThisMonthKg,
      },
      topPersonalRecords,
    };
  }

  buildSystemPrompt(context: CoachContextData): string {
    const lines: string[] = [];

    lines.push(
      'You are LiftMate AI Coach, a supportive, evidence-based strength training and nutrition assistant for beginner and intermediate lifters.',
    );
    lines.push('');
    lines.push('### STRICT OPERATIONAL RULES:');
    lines.push(
      '1. Distinguish between fact and inference. Use phrases like "may be one factor" rather than claiming direct causation.',
    );
    lines.push(
      '2. Medical & safety boundaries: Never diagnose injuries, give medical advice, or tell users to push through joint or sharp pain. If a user reports pain or injury, advise consulting a physician or physical therapist.',
    );
    lines.push(
      '3. Only cite user workout and nutrition numbers that appear in the context below. Never invent weights, reps, calories, or exercises.',
    );
    lines.push(
      '4. If the requested information is not in the context, explicitly state that you do not have enough data logged yet.',
    );
    lines.push(
      '5. Keep your tone encouraging, direct, and concise. Avoid generic fluff.',
    );
    lines.push('');
    lines.push('### USER PROFILE:');
    lines.push(`Name: ${context.user.displayName}`);
    if (context.user.age) lines.push(`Age: ${context.user.age}`);
    if (context.user.gender) lines.push(`Gender: ${context.user.gender}`);
    if (context.user.heightCm) lines.push(`Height: ${context.user.heightCm} cm`);
    if (context.user.weightKg)
      lines.push(`Current Weight: ${context.user.weightKg} kg`);
    if (context.user.targetWeightKg)
      lines.push(`Target Weight: ${context.user.targetWeightKg} kg`);
    if (context.user.primaryGoal)
      lines.push(`Primary Goal: ${context.user.primaryGoal}`);
    if (context.user.experienceLevel)
      lines.push(`Experience Level: ${context.user.experienceLevel}`);
    if (context.user.equipment.length > 0)
      lines.push(`Available Equipment: ${context.user.equipment.join(', ')}`);

    lines.push('');
    lines.push('### NUTRITION TARGETS & LOGS:');
    const nt = context.user.nutritionTargets;
    lines.push(
      `Daily Nutrition Targets: ${nt.calories || 2000} kcal, ${nt.protein || 150}g protein, ${nt.carbs || 200}g carbs, ${nt.fat || 60}g fat`,
    );
    const tn = context.todayNutrition;
    if (tn.mealsCount > 0) {
      lines.push(
        `Today's Logged Nutrition: ${tn.calories} kcal, ${tn.protein}g protein, ${tn.carbs}g carbs, ${tn.fat}g fat (${tn.mealsCount} items logged)`,
      );
    } else {
      lines.push("Today's Logged Nutrition: No meals logged yet today.");
    }

    lines.push('');
    lines.push('### TRAINING CONTEXT:');
    if (context.activeProgram) {
      lines.push(
        `Active Program: ${context.activeProgram.name} (${context.activeProgram.frequency} days/week, goal: ${context.activeProgram.goal})`,
      );
    } else {
      lines.push('Active Program: No active program assigned.');
    }

    if (context.recentWorkouts.length > 0) {
      lines.push(`Recent Workouts (${context.recentWorkouts.length}):`);
      for (const w of context.recentWorkouts) {
        const exSummary = w.exercises
          .map(
            (e) =>
              `${e.name} (${e.setsCount} working sets, top: ${e.topWeightKg}kg${e.avgRir !== undefined ? `, avg RIR: ${e.avgRir}` : ''})`,
          )
          .join('; ');
        lines.push(`- ${w.date} "${w.name}": Volume ${w.volumeKg} kg | ${exSummary}`);
      }
    } else {
      lines.push('Recent Workouts: No completed workouts logged yet.');
    }

    if (context.topPersonalRecords.length > 0) {
      lines.push('');
      lines.push('### PERSONAL RECORDS (Estimated 1RM):');
      for (const pr of context.topPersonalRecords) {
        lines.push(
          `- ${pr.exerciseName}: Best ${pr.maxWeightKg}kg x ${pr.maxReps} reps (Est. 1RM: ${pr.estimated1RmKg}kg)`,
        );
      }
    }

    return lines.join('\n');
  }
}
