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
import { emailSchema, passwordSchema, publicUserSchema } from "./user.js";

export { FitnessGoal };

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

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

/** Step 1: About You (§4.1) */
export const onboardingAboutYouSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(80),
  dateOfBirth: z.coerce.date(),
  gender: Gender,
  timezone: z.string().min(1).max(64),
});
export type OnboardingAboutYouInput = z.infer<typeof onboardingAboutYouSchema>;

/** Step 2: Your Body (§5, §5.1) */
export const onboardingYourBodySchema = z.object({
  heightCm: z.number().min(50).max(300),
  weightKg: z.number().min(20).max(500),
  bodyFatPct: z.number().min(1).max(70).nullable().optional(),
  targetWeightKg: z.number().min(20).max(500).nullable().optional(),
  weightUnit: WeightUnit.default("kg"),
});
export type OnboardingYourBodyInput = z.infer<typeof onboardingYourBodySchema>;

/** Backwards-compatible combination of Step 1 and Step 2 */
export const onboardingBasicsSchema = onboardingAboutYouSchema.merge(
  onboardingYourBodySchema
);
export type OnboardingBasicsInput = z.infer<typeof onboardingBasicsSchema>;

/** Step 3: Goals (§5.1) */
export const onboardingGoalSchema = z.object({
  primaryGoal: FitnessGoal,
  secondaryGoal: FitnessGoal.nullable().optional(),
});
export type OnboardingGoalInput = z.infer<typeof onboardingGoalSchema>;

/** Step 4: Training Profile (§6) */
export const onboardingTrainingSchema = z.object({
  experienceLevel: Difficulty,
  weeklyFrequency: z.number().int().min(2).max(6),
  workoutDuration: WorkoutDuration,
  trainingLocation: TrainingLocation,
});
export type OnboardingTrainingInput = z.infer<typeof onboardingTrainingSchema>;

/** Step 5: Equipment (§7) */
export const onboardingEquipmentSchema = z.object({
  equipment: z.array(Equipment).min(1),
});
export type OnboardingEquipmentInput = z.infer<typeof onboardingEquipmentSchema>;

/** Step 6: Training Preferences (§8) */
export const onboardingPreferencesSchema = z.object({
  preferredEquipment: z.array(Equipment).optional().default([]),
  preferredExercises: z.array(z.string()).optional().default([]),
  avoidExercises: z.array(z.string()).optional().default([]),
});
export type OnboardingPreferencesInput = z.infer<
  typeof onboardingPreferencesSchema
>;

/** Step 7: Nutrition Profile (§9) */
export const onboardingNutritionSchema = z.object({
  targetCalories: z.number().int().min(500).max(10000),
  targetProtein: z.number().int().min(0).max(1000),
  targetCarbs: z.number().int().min(0).max(2000),
  targetFat: z.number().int().min(0).max(1000),
  dietaryPreferences: z.array(z.string()).optional().default([]),
});
export type OnboardingNutritionInput = z.infer<
  typeof onboardingNutritionSchema
>;

/** Complete 7-step Onboarding Input Schema */
export const onboardingSchema = onboardingAboutYouSchema
  .merge(onboardingYourBodySchema)
  .merge(onboardingGoalSchema)
  .merge(onboardingTrainingSchema)
  .merge(onboardingEquipmentSchema)
  .merge(onboardingPreferencesSchema)
  .merge(onboardingNutritionSchema);
export type OnboardingInput = z.infer<typeof onboardingSchema>;
