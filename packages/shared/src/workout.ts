import { z } from "zod";
import {
  Difficulty,
  Equipment,
  MovementPattern,
  MuscleGroup,
  SetType,
  WeightUnit,
} from "./enums.js";

/**
 * Workout-tracker schemas (Phase 2).
 *
 * Design rules from the brief:
 * - All offline-writable rows use CLIENT-GENERATED UUIDs so the mobile app can
 *   create them offline and sync later without id collisions.
 * - `workout_sets.set_type` is `warmup | working`; volume counts working only.
 * - Soft-delete via `deletedAt`; `createdAt`/`updatedAt` for sync.
 */

export const uuid = z.string().uuid();

/* ------------------------------------------------------------------ *
 * Exercise (read + search)
 * ------------------------------------------------------------------ */

export const exerciseSchema = z.object({
  id: uuid,
  name: z.string().min(1).max(120),
  primaryMuscle: MuscleGroup,
  secondaryMuscles: z.array(MuscleGroup).default([]),
  equipment: Equipment,
  movementPattern: MovementPattern,
  difficulty: Difficulty,
  instructions: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

/** Query params for searching/filtering the exercise DB. */
export const exerciseSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  muscle: MuscleGroup.optional(),
  equipment: Equipment.optional(),
  difficulty: Difficulty.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ExerciseSearch = z.infer<typeof exerciseSearchSchema>;

/* ------------------------------------------------------------------ *
 * Workout set
 * ------------------------------------------------------------------ */

export const workoutSetInputSchema = z.object({
  id: uuid,
  position: z.number().int().min(0),
  setType: SetType.default("working"),
  weight: z.number().min(0).max(10000),
  weightUnit: WeightUnit.default("kg"),
  reps: z.number().int().min(0).max(10000),
  rir: z.number().int().min(0).max(50).nullable().optional(),
  completed: z.boolean().default(false),
});
export type WorkoutSetInput = z.infer<typeof workoutSetInputSchema>;

export const workoutSetSchema = workoutSetInputSchema.extend({
  workoutExerciseId: uuid,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type WorkoutSet = z.infer<typeof workoutSetSchema>;

/* ------------------------------------------------------------------ *
 * Workout exercise
 * ------------------------------------------------------------------ */

export const workoutExerciseInputSchema = z.object({
  id: uuid,
  exerciseId: uuid,
  position: z.number().int().min(0),
  sets: z.array(workoutSetInputSchema).default([]),
});
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseInputSchema>;

/* ------------------------------------------------------------------ *
 * Workout (create / update)
 * ------------------------------------------------------------------ */

export const createWorkoutSchema = z.object({
  id: uuid,
  name: z.string().min(1).max(120).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable().optional(),
  exercises: z.array(workoutExerciseInputSchema).default([]),
});
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export const updateWorkoutSchema = z.object({
  name: z.string().min(1).max(120).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
});
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

/** Add or update a single exercise within an existing workout. */
export const upsertWorkoutExerciseSchema = workoutExerciseInputSchema;
export type UpsertWorkoutExerciseInput = z.infer<typeof upsertWorkoutExerciseSchema>;

/** Add or update a single set within an existing workout exercise. */
export const upsertWorkoutSetSchema = workoutSetInputSchema;
export type UpsertWorkoutSetInput = z.infer<typeof upsertWorkoutSetSchema>;

/* ------------------------------------------------------------------ *
 * Read models returned by the API
 * ------------------------------------------------------------------ */

export const workoutExerciseSchema = z.object({
  id: uuid,
  workoutId: uuid,
  exerciseId: uuid,
  position: z.number().int(),
  exercise: exerciseSchema.optional(),
  sets: z.array(workoutSetSchema).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

export const workoutSchema = z.object({
  id: uuid,
  userId: uuid,
  name: z.string().nullable(),
  note: z.string().nullable(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  exercises: z.array(workoutExerciseSchema).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type Workout = z.infer<typeof workoutSchema>;

/** Compact summary returned after completing / for history lists. */
export const workoutSummarySchema = z.object({
  id: uuid,
  name: z.string().nullable(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  durationSeconds: z.number().int().nullable(),
  exerciseCount: z.number().int(),
  totalSets: z.number().int(),
  totalWorkingSets: z.number().int(),
  totalVolume: z.number(),
  volumeChangeVsPrevious: z.number().nullable(),
});
export type WorkoutSummary = z.infer<typeof workoutSummarySchema>;
