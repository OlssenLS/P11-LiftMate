import { z } from "zod";
import { uuid } from "./workout.js";

/**
 * Calculates estimated 1 Rep Max using the Epley formula: weight * (1 + reps / 30).
 * As required by LIFTMATE_AGENT_BRIEF §8, estimated 1RM must always be calculated
 * deterministically and labelled an estimate.
 */
export function calculateEstimated1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return Math.round(weightKg * 10) / 10;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Body weight log entry.
 */
export const bodyWeightLogSchema = z.object({
  id: uuid,
  userId: uuid,
  weightKg: z.number().min(20).max(500),
  loggedAt: z.coerce.date(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type BodyWeightLog = z.infer<typeof bodyWeightLogSchema>;

export const createBodyWeightLogSchema = z.object({
  id: uuid.optional(),
  weightKg: z.number().min(20).max(500),
  loggedAt: z.coerce.date().default(() => new Date()),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type CreateBodyWeightLogInput = z.infer<typeof createBodyWeightLogSchema>;

export const weightProgressSummarySchema = z.object({
  currentWeightKg: z.number().nullable(),
  startWeightKg: z.number().nullable(),
  targetWeightKg: z.number().nullable(),
  changeThisMonthKg: z.number().nullable(),
  history: z.array(
    z.object({
      id: uuid,
      date: z.string(),
      weightKg: z.number(),
      notes: z.string().nullable().optional(),
    }),
  ),
  sparkline: z.array(z.number()),
});
export type WeightProgressSummary = z.infer<typeof weightProgressSummarySchema>;

/**
 * Personal records and strength progress per exercise.
 */
export const exercisePersonalRecordSchema = z.object({
  id: uuid,
  userId: uuid,
  exerciseId: uuid,
  maxWeight: z.number(),
  maxReps: z.number(),
  maxEstimated1Rm: z.number(),
  achievedAt: z.coerce.date(),
  workoutSetId: uuid.nullable().optional(),
});
export type ExercisePersonalRecord = z.infer<typeof exercisePersonalRecordSchema>;

export const exerciseStrengthProgressSchema = z.object({
  exerciseId: uuid,
  exerciseName: z.string(),
  bestWeight: z.number(),
  bestReps: z.number(),
  maxEstimated1Rm: z.number(),
  history: z.array(
    z.object({
      date: z.string(),
      weight: z.number(),
      reps: z.number(),
      estimated1Rm: z.number(),
    }),
  ),
});
export type ExerciseStrengthProgress = z.infer<typeof exerciseStrengthProgressSchema>;

/**
 * Training volume progress.
 */
export const volumeProgressSummarySchema = z.object({
  totalVolumeKg: z.number(),
  range: z.enum(["week", "month"]),
  history: z.array(
    z.object({
      label: z.string(),
      volumeKg: z.number(),
    }),
  ),
  byMuscleGroup: z.array(
    z.object({
      muscleGroup: z.string(),
      volumeKg: z.number(),
      percentage: z.number(),
    }),
  ),
  sparkline: z.array(z.number()),
});
export type VolumeProgressSummary = z.infer<typeof volumeProgressSummarySchema>;

/**
 * Workout adherence and consistency progress.
 */
export const consistencyProgressSummarySchema = z.object({
  completedSessions: z.number(),
  plannedSessions: z.number(),
  consistencyPct: z.number(),
  streakWeeks: z.number(),
  weeklyBreakdown: z.array(
    z.object({
      weekLabel: z.string(),
      completed: z.number(),
      planned: z.number(),
    }),
  ),
});
export type ConsistencyProgressSummary = z.infer<typeof consistencyProgressSummarySchema>;

/**
 * Aggregated progress summary for Home screen and overview dashboards.
 */
export const progressOverviewSchema = z.object({
  weight: weightProgressSummarySchema,
  volume: volumeProgressSummarySchema,
  consistency: consistencyProgressSummarySchema,
  topPrs: z.array(exerciseStrengthProgressSchema),
});
export type ProgressOverview = z.infer<typeof progressOverviewSchema>;
