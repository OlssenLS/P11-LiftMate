import { z } from "zod";
import { FitnessGoal, ProgramStatus } from "./enums.js";
import { exerciseSchema, uuid } from "./workout.js";

/**
 * Program Exercise input & schema (Phase 3 Spec §33–38).
 */
export const programExerciseInputSchema = z.object({
  id: uuid.optional(),
  day: z.number().int().min(1).max(7),
  dayName: z.string().trim().max(100).nullable().optional(),
  exerciseId: uuid,
  sets: z.number().int().min(1).max(20).default(3),
  repMin: z.number().int().min(1).max(100).default(8),
  repMax: z.number().int().min(1).max(100).default(12),
  targetRir: z.number().int().min(0).max(10).nullable().optional(),
  restSeconds: z.number().int().min(0).max(600).nullable().optional(),
  order: z.number().int().min(0).default(0),
});
export type ProgramExerciseInput = z.infer<typeof programExerciseInputSchema>;

export const programExerciseSchema = z.object({
  id: uuid,
  programId: uuid,
  day: z.number().int().min(1).max(7),
  dayName: z.string().nullable().optional(),
  exerciseId: uuid,
  exercise: exerciseSchema.optional(),
  sets: z.number().int().min(1),
  repMin: z.number().int().min(1),
  repMax: z.number().int().min(1),
  targetRir: z.number().int().nullable().optional(),
  restSeconds: z.number().int().nullable().optional(),
  order: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type ProgramExercise = z.infer<typeof programExerciseSchema>;

/**
 * Program input & read schema.
 */
export const createProgramSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(120),
  goal: FitnessGoal,
  frequency: z.number().int().min(1).max(7),
  duration: z.string().default("45_60"),
  description: z.string().trim().max(1000).nullable().optional(),
  status: ProgramStatus.default("active"),
  exercises: z.array(programExerciseInputSchema).default([]),
});
export type CreateProgramInput = z.infer<typeof createProgramSchema>;

export const updateProgramSchema = createProgramSchema.partial();
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;

export const programSchema = z.object({
  id: uuid,
  userId: uuid.nullable().optional(),
  name: z.string(),
  goal: FitnessGoal,
  frequency: z.number().int(),
  duration: z.string(),
  description: z.string().nullable().optional(),
  status: ProgramStatus,
  programExercises: z.array(programExerciseSchema).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type Program = z.infer<typeof programSchema>;
