import { z } from "zod";
import {
  Difficulty,
  Equipment,
  FitnessGoal,
  Gender,
  TrainingLocation,
  WeightUnit,
  WorkoutDuration,
} from "./enums.js";

export const emailSchema = z.string().email().max(254).toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8)
  .max(128);

export const userSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  displayName: z.string().min(1).max(80),
  dateOfBirth: z.coerce.date().nullable(),
  weightUnit: WeightUnit.default("kg"),
  timezone: z.string().min(1).max(64),
  gender: Gender.nullable().optional(),
  heightCm: z.number().positive().nullable().optional(),
  weightKg: z.number().positive().nullable().optional(),
  bodyFatPct: z.number().min(0).max(100).nullable().optional(),
  targetWeightKg: z.number().positive().nullable().optional(),
  workoutDuration: WorkoutDuration.nullable().optional(),
  trainingLocation: TrainingLocation.nullable().optional(),
  onboardedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type User = z.infer<typeof userSchema>;

export const publicUserSchema = userSchema.omit({ deletedAt: true });
export type PublicUser = z.infer<typeof publicUserSchema>;

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(80),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateUserSchema = z
  .object({
    displayName: z.string().min(1).max(80),
    dateOfBirth: z.coerce.date().nullable(),
    weightUnit: WeightUnit,
    timezone: z.string().min(1).max(64),
    gender: Gender.nullable(),
    heightCm: z.number().positive().nullable(),
    weightKg: z.number().positive().nullable(),
    bodyFatPct: z.number().min(0).max(100).nullable(),
    targetWeightKg: z.number().positive().nullable(),
    workoutDuration: WorkoutDuration.nullable(),
    trainingLocation: TrainingLocation.nullable(),
  })
  .partial();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userPreferencesSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  preferredEquipment: z.array(Equipment).default([]),
  preferredExercises: z.array(z.string()).default([]),
  avoidExercises: z.array(z.string()).default([]),
  dietaryPreferences: z.array(z.string()).default([]),
  weeklyFrequency: z.number().int().min(1).max(7).nullable(),
  defaultRestSeconds: z.number().int().min(0).max(600).default(120),
  primaryGoal: FitnessGoal.nullable(),
  secondaryGoal: FitnessGoal.nullable(),
  experienceLevel: Difficulty.nullable(),
  targetCalories: z.number().int().min(0).nullable(),
  targetProtein: z.number().int().min(0).nullable(),
  targetCarbs: z.number().int().min(0).nullable(),
  targetFat: z.number().int().min(0).nullable(),
  notificationsWorkoutReminder: z.boolean().default(true),
  notificationsNutritionReminder: z.boolean().default(true),
  notificationsProgressReminder: z.boolean().default(true),
  notificationsAiInsight: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const updateUserPreferencesSchema = z
  .object({
    preferredEquipment: z.array(Equipment),
    preferredExercises: z.array(z.string().min(1).max(100)),
    avoidExercises: z.array(z.string().min(1).max(100)),
    dietaryPreferences: z.array(z.string().min(1).max(100)),
    weeklyFrequency: z.number().int().min(1).max(7).nullable(),
    defaultRestSeconds: z.number().int().min(0).max(600),
    primaryGoal: FitnessGoal.nullable(),
    secondaryGoal: FitnessGoal.nullable(),
    experienceLevel: Difficulty.nullable(),
    targetCalories: z.number().int().min(0).nullable(),
    targetProtein: z.number().int().min(0).nullable(),
    targetCarbs: z.number().int().min(0).nullable(),
    targetFat: z.number().int().min(0).nullable(),
    notificationsWorkoutReminder: z.boolean(),
    notificationsNutritionReminder: z.boolean(),
    notificationsProgressReminder: z.boolean(),
    notificationsAiInsight: z.boolean(),
  })
  .partial();
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateUserEquipmentSchema = z.object({
  equipment: z.array(Equipment).min(1, "Select at least one equipment item"),
});
export type UpdateUserEquipmentInput = z.infer<typeof updateUserEquipmentSchema>;

