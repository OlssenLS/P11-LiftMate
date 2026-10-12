import {
  BadRequestException,
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AI_PROVIDER, type AiProvider } from '../provider/ai-provider.interface.js';
import { ProgramsService } from '../../programs/programs.service.js';
import { AiRateLimiterService } from '../ai-rate-limiter.service.js';
import {
  ConfirmProgramPlanInput,
  GenerateProgramInput,
  GeneratedProgramPlan,
  GeneratedProgramExercise,
  FitnessGoal,
  Difficulty,
  WorkoutDuration,
  Equipment,
  MuscleGroup,
  Program,
} from '@liftmate/shared';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly programsService: ProgramsService,
    private readonly rateLimiter: AiRateLimiterService,
  ) {}

  async generatePlan(
    userId: string,
    input: GenerateProgramInput,
  ): Promise<GeneratedProgramPlan> {
    // 1. Rate limiter check
    await this.rateLimiter.checkAndIncrement(userId);

    // 2. Fetch user profile and preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        equipment: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const goal =
      input.goal ??
      (user.preferences?.primaryGoal as FitnessGoal) ??
      'build_muscle';

    const frequency =
      input.frequency ?? user.preferences?.weeklyFrequency ?? 3;

    const duration =
      input.duration ??
      (user.workoutDuration as WorkoutDuration) ??
      '45_60';

    const experience =
      input.experienceLevel ??
      (user.preferences?.experienceLevel as Difficulty) ??
      'intermediate';

    const availableEquipment =
      user.equipment.length > 0
        ? user.equipment.map((e) => e.equipment as Equipment)
        : [Equipment.enum.bodyweight];

    const avoidExercises = user.preferences?.avoidExercises ?? [];

    // 3. Load all active database exercises
    const allExercises = await this.prisma.exercise.findMany({
      where: { deletedAt: null },
    });

    // 4. Filter candidate exercises matching user equipment & avoid list
    const candidateExercises = allExercises.filter((ex) => {
      const eqMatches = availableEquipment.includes(ex.equipment as Equipment);
      const isAvoided =
        avoidExercises.includes(ex.id) ||
        avoidExercises.some((name) =>
          ex.name.toLowerCase().includes(name.toLowerCase()),
        );
      return eqMatches && !isAvoided;
    });

    if (candidateExercises.length < 4) {
      throw new BadRequestException(
        'Not enough exercises in database matching your available equipment. Please add more equipment in your profile.',
      );
    }

    // 5. Try calling AI Provider for generation
    let rawPlan: any = null;
    try {
      rawPlan = await this.callAiForPlan({
        goal,
        frequency,
        duration,
        experience,
        focusNotes: input.focusNotes,
        candidates: candidateExercises,
      });
    } catch (err) {
      this.logger.warn(
        `AI generation failed or invalid JSON, using deterministic engine: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    // 6. Validate & Normalize Plan (Brief §4 rule 12: strict DB exercise validation)
    return this.validateAndNormalizePlan({
      rawPlan,
      goal,
      frequency,
      duration,
      candidates: candidateExercises,
    });
  }

  private async callAiForPlan(params: {
    goal: string;
    frequency: number;
    duration: string;
    experience: string;
    focusNotes?: string;
    candidates: any[];
  }): Promise<any> {
    const catalogSummary = params.candidates
      .slice(0, 35)
      .map(
        (c) =>
          `ID: ${c.id} | Name: ${c.name} | Muscle: ${c.primaryMuscle} | Equipment: ${c.equipment}`,
      )
      .join('\n');

    const prompt = `You are an expert strength and conditioning coach.
Design a ${params.frequency}-day progressive overload workout split for a ${params.experience} lifter with the goal "${params.goal}".
Workout duration per session: ~${params.duration.replace('_', '-')} minutes.
${params.focusNotes ? `User special request: "${params.focusNotes}"` : ''}

CRITICAL RULES:
1. You MUST choose 4 to 6 exercises per day ONLY from the following verified exercise catalog:
${catalogSummary}
2. Never invent IDs or exercise names. Use exact IDs from the catalog.
3. Return ONLY valid JSON with no markdown wrapping, matching this exact structure:
{
  "name": "Program Name",
  "description": "Short program philosophy (2-3 sentences)",
  "days": [
    {
      "day": 1,
      "dayName": "e.g. Upper Body A or Push Day",
      "exercises": [
        {
          "exerciseId": "<exact id from catalog>",
          "sets": 3,
          "repMin": 8,
          "repMax": 12,
          "targetRir": 2,
          "restSeconds": 90,
          "order": 1
        }
      ]
    }
  ]
}`;

    const res = await this.aiProvider.generate({
      system: 'You are a certified exercise physiologist. Output strictly valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      maxTokens: 1500,
    });

    const jsonStr = res.content.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
    return JSON.parse(jsonStr);
  }

  private validateAndNormalizePlan(params: {
    rawPlan: any;
    goal: FitnessGoal;
    frequency: number;
    duration: string;
    candidates: any[];
  }): GeneratedProgramPlan {
    const { rawPlan, goal, frequency, duration, candidates } = params;
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    // If AI provided a valid structure with the expected number of days
    if (
      rawPlan &&
      Array.isArray(rawPlan.days) &&
      rawPlan.days.length === frequency
    ) {
      const validatedDays = rawPlan.days.map((d: any, dIdx: number) => {
        const rawExercises = Array.isArray(d.exercises) ? d.exercises : [];
        const validatedExercises: GeneratedProgramExercise[] = [];
        const usedIds = new Set<string>();

        rawExercises.forEach((e: any, exIdx: number) => {
          let matched = candidateMap.get(e.exerciseId);

          // If exercise is hallucinated or duplicate, find valid substitute
          if (!matched || usedIds.has(matched.id)) {
            const unusedCandidates = candidates.filter((c) => !usedIds.has(c.id));
            matched = unusedCandidates[exIdx % unusedCandidates.length] || candidates[0];
          }

          if (matched) {
            usedIds.add(matched.id);
            validatedExercises.push({
              exerciseId: matched.id,
              exerciseName: matched.name,
              primaryMuscle: matched.primaryMuscle as MuscleGroup,
              equipment: matched.equipment as Equipment,
              sets: Math.min(Math.max(Number(e.sets) || 3, 1), 6),
              repMin: Math.min(Math.max(Number(e.repMin) || 8, 1), 30),
              repMax: Math.min(Math.max(Number(e.repMax) || 12, 1), 30),
              targetRir: e.targetRir !== undefined ? Number(e.targetRir) : 2,
              restSeconds: e.restSeconds !== undefined ? Number(e.restSeconds) : 90,
              order: exIdx + 1,
            });
          }
        });

        // Ensure at least 4 exercises per day
        while (validatedExercises.length < 4 && candidates.length >= 4) {
          const unused = candidates.find((c) => !usedIds.has(c.id)) || candidates[0];
          usedIds.add(unused.id);
          validatedExercises.push({
            exerciseId: unused.id,
            exerciseName: unused.name,
            primaryMuscle: unused.primaryMuscle as MuscleGroup,
            equipment: unused.equipment as Equipment,
            sets: 3,
            repMin: 8,
            repMax: 12,
            targetRir: 2,
            restSeconds: 90,
            order: validatedExercises.length + 1,
          });
        }

        return {
          day: dIdx + 1,
          dayName: d.dayName?.trim() || `Day ${dIdx + 1}`,
          exercises: validatedExercises,
        };
      });

      return {
        name: rawPlan.name?.trim() || `AI ${goal.replace('_', ' ').toUpperCase()} Routine`,
        description:
          rawPlan.description?.trim() ||
          `Personalized ${frequency}-day program designed for progressive overload and ${goal.replace('_', ' ')}.`,
        goal,
        frequency,
        duration,
        days: validatedDays,
      };
    }

    // Deterministic Fallback: Generates balanced evidence-based plan
    return this.generateDeterministicPlan(goal, frequency, duration, candidates);
  }

  private generateDeterministicPlan(
    goal: FitnessGoal,
    frequency: number,
    duration: string,
    candidates: any[],
  ): GeneratedProgramPlan {
    const repMin = goal === 'gain_strength' ? 5 : goal === 'lose_fat' ? 10 : 8;
    const repMax = goal === 'gain_strength' ? 8 : goal === 'lose_fat' ? 15 : 12;
    const sets = goal === 'gain_strength' ? 4 : 3;
    const restSeconds = goal === 'gain_strength' ? 120 : 90;

    const dayTemplates: Array<{ name: string; muscles: string[] }> = [];

    if (frequency === 2) {
      dayTemplates.push(
        { name: 'Full Body A', muscles: ['chest', 'quads', 'back', 'shoulders', 'abs'] },
        { name: 'Full Body B', muscles: ['back', 'hamstrings', 'chest', 'biceps', 'triceps'] },
      );
    } else if (frequency === 3) {
      dayTemplates.push(
        { name: 'Push Focus', muscles: ['chest', 'shoulders', 'triceps', 'abs'] },
        { name: 'Pull Focus', muscles: ['back', 'lats', 'biceps', 'traps'] },
        { name: 'Legs & Core', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
      );
    } else if (frequency === 4) {
      dayTemplates.push(
        { name: 'Upper Body A', muscles: ['chest', 'back', 'shoulders', 'biceps'] },
        { name: 'Lower Body A', muscles: ['quads', 'hamstrings', 'calves', 'abs'] },
        { name: 'Upper Body B', muscles: ['back', 'chest', 'triceps', 'shoulders'] },
        { name: 'Lower Body B', muscles: ['hamstrings', 'quads', 'glutes', 'abs'] },
      );
    } else if (frequency === 5) {
      dayTemplates.push(
        { name: 'Chest & Triceps', muscles: ['chest', 'triceps', 'abs'] },
        { name: 'Back & Biceps', muscles: ['back', 'lats', 'biceps'] },
        { name: 'Legs Focus', muscles: ['quads', 'hamstrings', 'calves'] },
        { name: 'Shoulders & Arms', muscles: ['shoulders', 'biceps', 'triceps', 'abs'] },
        { name: 'Full Body Power', muscles: ['chest', 'back', 'quads', 'glutes'] },
      );
    } else {
      // 6 days
      dayTemplates.push(
        { name: 'Push A', muscles: ['chest', 'shoulders', 'triceps'] },
        { name: 'Pull A', muscles: ['back', 'lats', 'biceps'] },
        { name: 'Legs A', muscles: ['quads', 'hamstrings', 'calves'] },
        { name: 'Push B', muscles: ['chest', 'shoulders', 'triceps', 'abs'] },
        { name: 'Pull B', muscles: ['back', 'biceps', 'traps'] },
        { name: 'Legs B', muscles: ['hamstrings', 'quads', 'glutes'] },
      );
    }

    const days = dayTemplates.map((dt, dIdx) => {
      const usedIds = new Set<string>();
      const exercises: GeneratedProgramExercise[] = [];

      dt.muscles.forEach((muscle) => {
        const match = candidates.find(
          (c) => c.primaryMuscle === muscle && !usedIds.has(c.id),
        );
        if (match) {
          usedIds.add(match.id);
          exercises.push({
            exerciseId: match.id,
            exerciseName: match.name,
            primaryMuscle: match.primaryMuscle as MuscleGroup,
            equipment: match.equipment as Equipment,
            sets,
            repMin,
            repMax,
            targetRir: 2,
            restSeconds,
            order: exercises.length + 1,
          });
        }
      });

      // Fill remaining slots if fewer than 4 exercises
      let candidateIdx = 0;
      while (exercises.length < 4 && candidateIdx < candidates.length) {
        const candidate = candidates[candidateIdx++];
        if (!usedIds.has(candidate.id)) {
          usedIds.add(candidate.id);
          exercises.push({
            exerciseId: candidate.id,
            exerciseName: candidate.name,
            primaryMuscle: candidate.primaryMuscle as MuscleGroup,
            equipment: candidate.equipment as Equipment,
            sets,
            repMin,
            repMax,
            targetRir: 2,
            restSeconds,
            order: exercises.length + 1,
          });
        }
      }

      return {
        day: dIdx + 1,
        dayName: dt.name,
        exercises,
      };
    });

    const goalTitles: Record<string, string> = {
      lose_fat: 'Fat Loss & Conditioning Split',
      build_muscle: 'Hypertrophy Periodization Routine',
      gain_strength: 'Strength & Power Split',
      general_fitness: 'Functional Health & Longevity Split',
      body_recomposition: 'Body Recomposition Split',
    };

    return {
      name: `AI ${goalTitles[goal] || 'Custom Training Program'}`,
      description: `Optimized ${frequency}-day program tailored to your equipment profile, targeting progressive overload with 1-2 RIR in reserve.`,
      goal,
      frequency,
      duration,
      days,
    };
  }

  async confirmPlan(
    userId: string,
    input: ConfirmProgramPlanInput,
  ): Promise<Program> {
    const { plan, activateImmediately } = input;

    if (!plan.days || plan.days.length === 0) {
      throw new BadRequestException('Plan must contain at least one day');
    }

    // Flatten days and exercises into CreateProgramInput format
    const flattenedExercises: any[] = [];
    plan.days.forEach((d) => {
      d.exercises.forEach((ex) => {
        flattenedExercises.push({
          day: d.day,
          dayName: d.dayName,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          repMin: ex.repMin,
          repMax: ex.repMax,
          targetRir: ex.targetRir ?? null,
          restSeconds: ex.restSeconds ?? null,
          order: ex.order,
        });
      });
    });

    const created = await this.programsService.create(userId, {
      name: plan.name,
      description: plan.description,
      goal: plan.goal as any,
      frequency: plan.frequency,
      duration: plan.duration,
      status: activateImmediately ? 'active' : 'archived',
      exercises: flattenedExercises,
    });

    if (activateImmediately) {
      return this.programsService.activate(userId, created.id);
    }

    return created;
  }
}
