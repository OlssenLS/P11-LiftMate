import { z } from "zod";
import {
  AiMessageRole,
  AiInsightCategory,
  AiInsightConfidence,
  FitnessGoal,
  Difficulty,
  WorkoutDuration,
  Equipment,
  MuscleGroup,
  MealType,
} from "./enums.js";

// Message Schema
export const AiMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: AiMessageRole,
  content: z.string(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string().datetime(),
});
export type AiMessage = z.infer<typeof AiMessageSchema>;

export const SendAiMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty").max(2000, "Message cannot exceed 2000 characters"),
  metadata: z.record(z.any()).optional(),
});
export const sendAiMessageSchema = SendAiMessageSchema;
export type SendAiMessageInput = z.infer<typeof SendAiMessageSchema>;

// Conversation Schema
export const AiConversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastMessage: AiMessageSchema.optional(),
});
export const aiConversationSchema = AiConversationSchema;
export type AiConversation = z.infer<typeof AiConversationSchema>;

export const CreateAiConversationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  initialMessage: z.string().min(1).max(2000).optional(),
});
export const createAiConversationSchema = CreateAiConversationSchema;
export type CreateAiConversationInput = z.infer<typeof CreateAiConversationSchema>;

export const AiConversationDetailSchema = AiConversationSchema.extend({
  messages: z.array(AiMessageSchema),
});
export type AiConversationDetail = z.infer<typeof AiConversationDetailSchema>;

// Insights & Analytics Schemas (§50–§57)
export const AiInsightActionSchema = z.enum(["ask_coach", "review_plan", "none"]);
export type AiInsightAction = z.infer<typeof AiInsightActionSchema>;

export const AiInsightSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  category: AiInsightCategory,
  title: z.string(),
  observation: z.string(),
  evidence: z.string(),
  possibleFactors: z.array(z.string()),
  recommendation: z.string(),
  action: AiInsightActionSchema.default("ask_coach"),
  confidence: AiInsightConfidence,
  dataWindowStart: z.string().datetime().nullable().optional(),
  dataWindowEnd: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});
export const aiInsightSchema = AiInsightSchema;
export type AiInsight = z.infer<typeof AiInsightSchema>;

export const AnalyticsSufficiencySchema = z.object({
  isSufficient: z.boolean(),
  workoutCount: z.number().int(),
  nutritionDaysCount: z.number().int(),
  weightLogsCount: z.number().int(),
  minimumWorkoutsRequired: z.number().int(),
  minimumNutritionDaysRequired: z.number().int(),
  message: z.string(),
});
export const analyticsSufficiencySchema = AnalyticsSufficiencySchema;
export type AnalyticsSufficiency = z.infer<typeof AnalyticsSufficiencySchema>;

export const StructuredAnalyticsMetricsSchema = z.object({
  timeframeWeeks: z.number(),
  workoutsCompleted: z.number(),
  plannedSessions: z.number(),
  adherencePct: z.number(),
  averageWeeklyVolumeKg: z.number(),
  volumeDeltaPct: z.number().nullable(),
  averageDailyCalories: z.number(),
  targetCalories: z.number().nullable(),
  calorieAdherencePct: z.number().nullable(),
  averageDailyProteinGrams: z.number(),
  targetProteinGrams: z.number().nullable(),
  proteinAdherencePct: z.number().nullable(),
  averageRir: z.number().nullable(),
  weightChangeKg: z.number().nullable(),
  topProgressingExercises: z.array(
    z.object({
      exerciseName: z.string(),
      deltaKg: z.number(),
      best1Rm: z.number(),
    })
  ),
  stagnantExercises: z.array(
    z.object({
      exerciseName: z.string(),
      sessionsCount: z.number(),
      currentLoadKg: z.number(),
    })
  ),
});
export const structuredAnalyticsMetricsSchema = StructuredAnalyticsMetricsSchema;
export type StructuredAnalyticsMetrics = z.infer<typeof StructuredAnalyticsMetricsSchema>;

export const AnalyticsOverviewResponseSchema = z.object({
  sufficiency: AnalyticsSufficiencySchema,
  metrics: StructuredAnalyticsMetricsSchema.nullable(),
  insights: z.array(AiInsightSchema),
  primaryInsight: AiInsightSchema.nullable(),
});
export const analyticsOverviewResponseSchema = AnalyticsOverviewResponseSchema;
export type AnalyticsOverviewResponse = z.infer<typeof AnalyticsOverviewResponseSchema>;

export const GenerateAnalyticsInputSchema = z.object({
  forceRefresh: z.boolean().optional(),
});
export const generateAnalyticsInputSchema = GenerateAnalyticsInputSchema;
export type GenerateAnalyticsInput = z.infer<typeof GenerateAnalyticsInputSchema>;

// Suggested Questions
export const SuggestedQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  category: z.string(),
});
export type SuggestedQuestion = z.infer<typeof SuggestedQuestionSchema>;

export const SuggestedQuestionsResponseSchema = z.object({
  suggestions: z.array(SuggestedQuestionSchema),
});
export type SuggestedQuestionsResponse = z.infer<typeof SuggestedQuestionsResponseSchema>;

// Provider Interfaces
export interface AiImagePart {
  mimeType: string;
  base64: string;
}

export interface AiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  images?: AiImagePart[];
}

export interface AiProviderGenerateOptions {
  system: string;
  messages: AiChatMessage[];
  maxTokens?: number;
  temperature?: number;
  images?: AiImagePart[];
}

export interface AiProviderGenerateResult {
  content: string;
  finishReason?: string;
  provider?: string;
  isLiveApi?: boolean;
  latencyMs?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// AI Coach Diagnostic & Status Schemas
export const AiCoachStatusSchema = z.object({
  status: z.string(),
  hasApiKey: z.boolean(),
  maskedKey: z.string().nullable(),
  model: z.string(),
  mode: z.enum(["live_gemini", "deterministic_fallback"]),
  rateLimit: z.object({
    dailyLimit: z.number(),
    usedToday: z.number(),
    remainingToday: z.number(),
  }),
});
export const aiCoachStatusSchema = AiCoachStatusSchema;
export type AiCoachStatus = z.infer<typeof AiCoachStatusSchema>;

// AI Workout Planner Schemas (§33–§38)
export const GenerateProgramInputSchema = z.object({
  goal: FitnessGoal.optional(),
  experienceLevel: Difficulty.optional(),
  frequency: z.number().int().min(2).max(6).optional(),
  duration: WorkoutDuration.optional(),
  focusNotes: z.string().max(500).optional(),
});
export const generateProgramInputSchema = GenerateProgramInputSchema;
export type GenerateProgramInput = z.infer<typeof GenerateProgramInputSchema>;

export const GeneratedProgramExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseName: z.string(),
  primaryMuscle: MuscleGroup,
  equipment: Equipment,
  sets: z.number().int().min(1).max(10),
  repMin: z.number().int().min(1).max(50),
  repMax: z.number().int().min(1).max(50),
  targetRir: z.number().int().min(0).max(5).nullable().optional(),
  restSeconds: z.number().int().min(15).max(360).nullable().optional(),
  order: z.number().int(),
});
export type GeneratedProgramExercise = z.infer<typeof GeneratedProgramExerciseSchema>;

export const GeneratedProgramDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  dayName: z.string(),
  exercises: z.array(GeneratedProgramExerciseSchema),
});
export type GeneratedProgramDay = z.infer<typeof GeneratedProgramDaySchema>;

export const GeneratedProgramPlanSchema = z.object({
  name: z.string(),
  description: z.string(),
  goal: FitnessGoal,
  frequency: z.number().int().min(2).max(6),
  duration: z.string(),
  days: z.array(GeneratedProgramDaySchema),
});
export const generatedProgramPlanSchema = GeneratedProgramPlanSchema;
export type GeneratedProgramPlan = z.infer<typeof GeneratedProgramPlanSchema>;

export const ConfirmProgramPlanInputSchema = z.object({
  plan: GeneratedProgramPlanSchema,
  activateImmediately: z.boolean().default(true),
});
export const confirmProgramPlanInputSchema = ConfirmProgramPlanInputSchema;
export type ConfirmProgramPlanInput = z.infer<typeof ConfirmProgramPlanInputSchema>;

// AI Food Recognition Schemas (§29–§32)
export const AiFoodRecognitionConfidence = z.enum(["high", "medium", "low"]);
export type AiFoodRecognitionConfidence = z.infer<typeof AiFoodRecognitionConfidence>;

export const DetectedFoodItemSchema = z.object({
  foodName: z.string(),
  portionGrams: z.number().positive(),
  confidence: AiFoodRecognitionConfidence,
});
export type DetectedFoodItem = z.infer<typeof DetectedFoodItemSchema>;

export const RecognizedFoodItemSchema = z.object({
  id: z.string().uuid(),
  detectedName: z.string(),
  matchedFoodId: z.string().uuid().nullable().optional(),
  matchedFoodName: z.string(),
  servingSize: z.string(),
  servingWeightG: z.number().nullable().optional(),
  portionGrams: z.number().positive(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  confidence: AiFoodRecognitionConfidence,
  source: z.string().default("ai_recognition"),
});
export const recognizedFoodItemSchema = RecognizedFoodItemSchema;
export type RecognizedFoodItem = z.infer<typeof RecognizedFoodItemSchema>;

export const RecognizeFoodInputSchema = z.object({
  imageBase64: z.string().min(1, "Image data cannot be empty"),
  mimeType: z.string().default("image/jpeg"),
  mealType: MealType.optional(),
});
export const recognizeFoodInputSchema = RecognizeFoodInputSchema;
export type RecognizeFoodInput = z.infer<typeof RecognizeFoodInputSchema>;

export const RecognizeFoodResponseSchema = z.object({
  imageSummary: z.string(),
  items: z.array(RecognizedFoodItemSchema),
  overallConfidence: AiFoodRecognitionConfidence,
  hasLowConfidenceWarning: z.boolean(),
  warningMessage: z.string().nullable().optional(),
  totalEstimatedCalories: z.number(),
  totalEstimatedProtein: z.number(),
  totalEstimatedCarbs: z.number(),
  totalEstimatedFat: z.number(),
  isEstimated: z.literal(true).default(true),
});
export const recognizeFoodResponseSchema = RecognizeFoodResponseSchema;
export type RecognizeFoodResponse = z.infer<typeof RecognizeFoodResponseSchema>;

export const ConfirmFoodRecognitionItemSchema = z.object({
  foodId: z.string().uuid().nullable().optional(),
  foodName: z.string().min(1),
  servingSize: z.string().min(1),
  portionGrams: z.number().positive(),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
});
export const confirmFoodRecognitionItemSchema = ConfirmFoodRecognitionItemSchema;
export type ConfirmFoodRecognitionItem = z.infer<typeof ConfirmFoodRecognitionItemSchema>;

export const ConfirmFoodRecognitionInputSchema = z.object({
  mealType: MealType,
  loggedAt: z.coerce.date().default(() => new Date()),
  items: z.array(ConfirmFoodRecognitionItemSchema).min(1, "At least one food item must be selected"),
});
export const confirmFoodRecognitionInputSchema = ConfirmFoodRecognitionInputSchema;
export type ConfirmFoodRecognitionInput = z.infer<typeof ConfirmFoodRecognitionInputSchema>;

