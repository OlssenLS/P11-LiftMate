import { z } from "zod";
import { Difficulty, Equipment, WeightUnit } from "./enums.js";
import { publicUserSchema } from "./user.js";

export const FitnessGoal = z.enum([
  "lose_fat",
  "build_muscle",
  "gain_strength",
  "general_fitness",
]);
export type FitnessGoal = z.infer<typeof FitnessGoal>;

export const accessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  type: z.literal("access"),
});
export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

export const refreshTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  jti: z.string().uuid(),
  type: z.literal("refresh"),
});
export type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const authResponseSchema = z.object({
  user: publicUserSchema,
  tokens: authTokensSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const logoutRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;

export const onboardingBasicsSchema = z.object({
  displayName: z.string().min(1).max(80),
  dateOfBirth: z.coerce.date(),
  weightUnit: WeightUnit,
  timezone: z.string().min(1).max(64),
});
export type OnboardingBasicsInput = z.infer<typeof onboardingBasicsSchema>;

export const onboardingGoalSchema = z.object({
  primaryGoal: FitnessGoal,
  secondaryGoal: FitnessGoal.nullable().optional(),
});
export type OnboardingGoalInput = z.infer<typeof onboardingGoalSchema>;

export const onboardingTrainingSchema = z.object({
  experienceLevel: Difficulty,
  weeklyFrequency: z.number().int().min(1).max(7),
});
export type OnboardingTrainingInput = z.infer<typeof onboardingTrainingSchema>;

export const onboardingEquipmentSchema = z.object({
  equipment: z.array(Equipment).min(1),
});
export type OnboardingEquipmentInput = z.infer<typeof onboardingEquipmentSchema>;

export const onboardingNutritionSchema = z.object({
  targetCalories: z.number().int().min(500).max(10000),
  targetProtein: z.number().int().min(0).max(1000),
  targetCarbs: z.number().int().min(0).max(2000),
  targetFat: z.number().int().min(0).max(1000),
});
export type OnboardingNutritionInput = z.infer<typeof onboardingNutritionSchema>;

export const onboardingSchema = onboardingBasicsSchema
  .merge(onboardingGoalSchema)
  .merge(onboardingTrainingSchema)
  .merge(onboardingEquipmentSchema)
  .merge(onboardingNutritionSchema);
export type OnboardingInput = z.infer<typeof onboardingSchema>;
