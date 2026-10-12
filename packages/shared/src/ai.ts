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

// Insights Schema
export const AiInsightSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  category: AiInsightCategory,
  title: z.string(),
  observation: z.string(),
  evidence: z.string(),
  possibleFactors: z.array(z.string()),
  recommendation: z.string(),
  confidence: AiInsightConfidence,
  dataWindowStart: z.string().datetime().nullable().optional(),
  dataWindowEnd: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type AiInsight = z.infer<typeof AiInsightSchema>;

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
export interface AiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiProviderGenerateOptions {
  system: string;
  messages: AiChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AiProviderGenerateResult {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

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
