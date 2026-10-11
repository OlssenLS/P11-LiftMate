import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  AiMessageRole,
  AiInsightCategory,
  AiInsightConfidence,
} from '@liftmate/shared';

describe('Migration M-F AI Conversations, Messages & Insights Schema Integrity', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('verifies shared AI enums', () => {
    expect(AiMessageRole.options).toEqual(['user', 'assistant', 'system']);
    expect(AiInsightCategory.options).toContain('training_volume');
    expect(AiInsightCategory.options).toContain('progressive_overload');
    expect(AiInsightCategory.options).toContain('recovery_fatigue');
    expect(AiInsightCategory.options).toContain('nutrition_protein');
    expect(AiInsightCategory.options).toContain('consistency_streak');
    expect(AiInsightConfidence.options).toEqual([
      'high',
      'medium',
      'low',
      'insufficient',
    ]);
  });

  it('can create AiConversation, add AiMessages, and query with cascades', async () => {
    const user = await prisma.user.findFirst();
    expect(user).toBeDefined();
    if (!user) return;

    const convId = randomUUID();
    const msg1Id = randomUUID();
    const msg2Id = randomUUID();

    // 1. Create conversation
    const conversation = await prisma.aiConversation.create({
      data: {
        id: convId,
        userId: user.id,
        title: 'Workout Feedback Discussion',
      },
    });

    expect(conversation.id).toBe(convId);
    expect(conversation.title).toBe('Workout Feedback Discussion');

    // 2. Add user message
    const userMsg = await prisma.aiMessage.create({
      data: {
        id: msg1Id,
        conversationId: convId,
        role: 'user',
        content: 'How was my bench press volume this week?',
      },
    });
    expect(userMsg.role).toBe('user');
    expect(userMsg.content).toBe('How was my bench press volume this week?');

    // 3. Add assistant message
    const assistantMsg = await prisma.aiMessage.create({
      data: {
        id: msg2Id,
        conversationId: convId,
        role: 'assistant',
        content: 'You completed 12 working sets with progressive overload.',
        metadata: {
          confidence: 'high',
          contextTokens: 150,
        },
      },
    });
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.metadata).toBeDefined();

    // 4. Query conversation with messages ordered by createdAt
    const fetched = await prisma.aiConversation.findUnique({
      where: { id: convId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    expect(fetched).not.toBeNull();
    expect(fetched?.messages.length).toBe(2);
    expect(fetched?.messages[0].id).toBe(msg1Id);
    expect(fetched?.messages[1].id).toBe(msg2Id);

    // 5. Delete conversation and verify messages cascade delete
    await prisma.aiConversation.delete({ where: { id: convId } });

    const orphanMessages = await prisma.aiMessage.findMany({
      where: { conversationId: convId },
    });
    expect(orphanMessages.length).toBe(0);
  });

  it('can create, update, and soft-delete AiInsight records', async () => {
    const user = await prisma.user.findFirst();
    expect(user).toBeDefined();
    if (!user) return;

    const insightId = randomUUID();

    // 1. Create Insight
    const insight = await prisma.aiInsight.create({
      data: {
        id: insightId,
        userId: user.id,
        category: 'progressive_overload',
        title: 'Chest Volume Increased by 15%',
        observation: 'Your chest volume rose by 15% across the last 2 weeks.',
        evidence: 'Bench press working sets increased from 8 to 10 sets.',
        possibleFactors: ['Good sleep', 'Consistent caloric surplus'],
        recommendation: 'Maintain this volume for one more week before deloading.',
        confidence: 'high',
        dataWindowStart: new Date(Date.now() - 14 * 86400000),
        dataWindowEnd: new Date(),
      },
    });

    expect(insight.id).toBe(insightId);
    expect(insight.category).toBe('progressive_overload');
    expect(insight.possibleFactors).toContain('Good sleep');

    // 2. Soft-delete Insight
    const softDeleted = await prisma.aiInsight.update({
      where: { id: insightId },
      data: {
        deletedAt: new Date(),
      },
    });
    expect(softDeleted.deletedAt).not.toBeNull();

    // Cleanup
    await prisma.aiInsight.delete({ where: { id: insightId } });
  });
});
