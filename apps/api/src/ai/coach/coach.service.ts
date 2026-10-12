import {
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AI_PROVIDER, type AiProvider } from '../provider/ai-provider.interface.js';
import { CoachContextService } from './coach-context.service.js';
import { AiRateLimiterService } from '../ai-rate-limiter.service.js';
import {
  AiConversation,
  AiConversationDetail,
  CreateAiConversationInput,
  SendAiMessageInput,
  SuggestedQuestionsResponse,
  AiChatMessage,
  AiCoachStatus,
} from '@liftmate/shared';

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly contextService: CoachContextService,
    private readonly rateLimiter: AiRateLimiterService,
  ) {}

  async getConversations(userId: string): Promise<AiConversation[]> {
    const list = await this.prisma.aiConversation.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return list.map((c) => ({
      id: c.id,
      userId: c.userId,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: c.messages[0]
        ? {
            id: c.messages[0].id,
            conversationId: c.messages[0].conversationId,
            role: c.messages[0].role as any,
            content: c.messages[0].content,
            metadata: (c.messages[0].metadata as any) || undefined,
            createdAt: c.messages[0].createdAt.toISOString(),
          }
        : undefined,
    }));
  }

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<AiConversationDetail> {
    const conv = await this.prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        deletedAt: null,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      id: conv.id,
      userId: conv.userId,
      title: conv.title,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messages: conv.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role as any,
        content: m.content,
        metadata: (m.metadata as any) || undefined,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async getOrCreateActiveConversation(userId: string): Promise<AiConversationDetail> {
    const latest = await this.prisma.aiConversation.findFirst({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (latest) {
      return {
        id: latest.id,
        userId: latest.userId,
        title: latest.title,
        createdAt: latest.createdAt.toISOString(),
        updatedAt: latest.updatedAt.toISOString(),
        messages: latest.messages.map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          role: m.role as any,
          content: m.content,
          metadata: (m.metadata as any) || undefined,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    }

    const created = await this.prisma.aiConversation.create({
      data: {
        userId,
        title: 'Coach Chat',
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      title: created.title,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      messages: [],
    };
  }

  async createConversation(
    userId: string,
    input: CreateAiConversationInput,
  ): Promise<AiConversationDetail> {
    const title = input.title?.trim() || 'Coaching Session';

    const conv = await this.prisma.aiConversation.create({
      data: {
        userId,
        title,
      },
    });

    if (input.initialMessage?.trim()) {
      await this.sendMessage(userId, conv.id, {
        content: input.initialMessage.trim(),
      });
      return this.getConversation(userId, conv.id);
    }

    return {
      id: conv.id,
      userId: conv.userId,
      title: conv.title,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messages: [],
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    input: SendAiMessageInput,
  ): Promise<{ userMessage: any; assistantMessage: any }> {
    const conv = await this.prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        deletedAt: null,
      },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    // 1. Rate limiter check
    await this.rateLimiter.checkAndIncrement(userId);

    // 2. Persist user message
    const userMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: input.content.trim(),
        metadata: input.metadata ?? undefined,
      },
    });

    // 3. Build context & system prompt
    const context = await this.contextService.buildContext(userId);
    const systemPrompt = this.contextService.buildSystemPrompt(context);

    // 4. Fetch recent conversation history (last 10)
    const recentMessages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const chatHistory: AiChatMessage[] = recentMessages
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

    // 5. Generate assistant response
    this.logger.log(`[CoachService] 🧠 Generating coaching response for user ${userId} in conversation ${conversationId}`);
    const aiResult = await this.aiProvider.generate({
      system: systemPrompt,
      messages: chatHistory,
      temperature: 0.7,
      maxTokens: 800,
    });
    this.logger.log(
      `[CoachService] 🤖 Response generated (live: ${aiResult.isLiveApi ?? false}, provider: ${aiResult.provider ?? 'unknown'}, latency: ${aiResult.latencyMs ?? 0}ms)`,
    );

    // 6. Persist assistant message with diagnostics metadata
    const assistantMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResult.content,
        metadata: {
          finishReason: aiResult.finishReason,
          provider: aiResult.provider ?? 'gemini-1.5-flash',
          isLiveApi: aiResult.isLiveApi ?? false,
          latencyMs: aiResult.latencyMs ?? 0,
          usage: aiResult.usage,
        },
      },
    });

    // 7. Update conversation updatedAt
    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      userMessage: {
        id: userMessage.id,
        conversationId: userMessage.conversationId,
        role: userMessage.role,
        content: userMessage.content,
        metadata: userMessage.metadata,
        createdAt: userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        id: assistantMessage.id,
        conversationId: assistantMessage.conversationId,
        role: assistantMessage.role,
        content: assistantMessage.content,
        metadata: assistantMessage.metadata,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
    };
  }

  async getSuggestedQuestions(userId: string): Promise<SuggestedQuestionsResponse> {
    const context = await this.contextService.buildContext(userId);
    const suggestions = [];

    if (context.recentWorkouts.length > 0) {
      suggestions.push({
        id: 'review-recent-workout',
        prompt: `How was my volume and RIR in my latest workout?`,
        category: 'training',
      });
    } else {
      suggestions.push({
        id: 'start-training-plan',
        prompt: `What exercises should I start with for my goal?`,
        category: 'training',
      });
    }

    if (context.todayNutrition.mealsCount > 0) {
      suggestions.push({
        id: 'today-nutrition-check',
        prompt: `Am I on track with my protein target today?`,
        category: 'nutrition',
      });
    } else {
      suggestions.push({
        id: 'nutrition-advice',
        prompt: `How should I distribute my protein throughout the day?`,
        category: 'nutrition',
      });
    }

    if (context.topPersonalRecords.length > 0) {
      const topPr = context.topPersonalRecords[0];
      suggestions.push({
        id: 'pr-overload',
        prompt: `How can I progress on ${topPr.exerciseName}?`,
        category: 'progression',
      });
    } else {
      suggestions.push({
        id: 'progressive-overload',
        prompt: `What is the best way to apply progressive overload safely?`,
        category: 'progression',
      });
    }

    suggestions.push({
      id: 'recovery-guidance',
      prompt: `How much rest between sets should I take for muscle growth?`,
      category: 'recovery',
    });

    return { suggestions };
  }

  async getCoachStatus(userId: string): Promise<AiCoachStatus> {
    const providerStatus = (this.aiProvider as any).getStatus
      ? (this.aiProvider as any).getStatus()
      : {
          hasApiKey: false,
          maskedKey: null,
          model: 'gemini-1.5-flash',
          mode: 'deterministic_fallback' as const,
        };

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const usedToday = await this.prisma.aiMessage.count({
      where: {
        role: 'user',
        conversation: { userId },
        createdAt: { gte: startOfDay },
      },
    });

    const dailyLimit = 50;
    const remainingToday = Math.max(0, dailyLimit - usedToday);

    return {
      status: 'ok',
      hasApiKey: providerStatus.hasApiKey,
      maskedKey: providerStatus.maskedKey,
      model: providerStatus.model,
      mode: providerStatus.mode,
      rateLimit: {
        dailyLimit,
        usedToday,
        remainingToday,
      },
    };
  }
}
