import { z } from "zod";
import {
  AiMessageRole,
  AiInsightCategory,
  AiInsightConfidence,
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
