import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoachService } from './coach.service.js';
import { NotFoundException } from '@nestjs/common';

describe('CoachService', () => {
  let service: CoachService;
  let mockPrisma: any;
  let mockAiProvider: any;
  let mockContextService: any;
  let mockRateLimiter: any;

  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testConvId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    mockPrisma = {
      aiConversation: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      aiMessage: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
    };

    mockAiProvider = {
      generate: vi.fn().mockResolvedValue({
        content: 'Focus on progressive overload with 1-2 RIR in reserve.',
        finishReason: 'STOP',
        usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
      }),
    };

    mockContextService = {
      buildContext: vi.fn().mockResolvedValue({
        user: {
          displayName: 'John Doe',
          primaryGoal: 'build_muscle',
          equipment: ['barbell', 'dumbbell'],
          nutritionTargets: { calories: 2500, protein: 180 },
        },
        recentWorkouts: [
          {
            name: 'Push Day',
            date: '2026-10-10',
            volumeKg: 6500,
            exercises: [{ name: 'Bench Press', setsCount: 4, topWeightKg: 80 }],
          },
        ],
        todayNutrition: {
          calories: 1200,
          protein: 95,
          carbs: 110,
          fat: 35,
          mealsCount: 2,
        },
        topPersonalRecords: [
          {
            exerciseName: 'Bench Press',
            maxWeightKg: 85,
            maxReps: 5,
            estimated1RmKg: 99.2,
          },
        ],
      }),
      buildSystemPrompt: vi.fn().mockReturnValue('SYSTEM PROMPT STRING'),
    };

    mockRateLimiter = {
      checkAndIncrement: vi.fn().mockResolvedValue({ remaining: 49 }),
    };

    service = new CoachService(
      mockPrisma,
      mockAiProvider,
      mockContextService,
      mockRateLimiter,
    );
  });

  describe('getConversations', () => {
    it('returns conversations with mapped lastMessage', async () => {
      mockPrisma.aiConversation.findMany.mockResolvedValue([
        {
          id: testConvId,
          userId: testUserId,
          title: 'Training Chat',
          createdAt: new Date('2026-10-10T10:00:00Z'),
          updatedAt: new Date('2026-10-10T10:05:00Z'),
          messages: [
            {
              id: '33333333-3333-3333-3333-333333333333',
              conversationId: testConvId,
              role: 'assistant',
              content: 'Good job on push day!',
              metadata: null,
              createdAt: new Date('2026-10-10T10:05:00Z'),
            },
          ],
        },
      ]);

      const result = await service.getConversations(testUserId);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(testConvId);
      expect(result[0].title).toBe('Training Chat');
      expect(result[0].lastMessage?.content).toBe('Good job on push day!');
    });
  });

  describe('getConversation', () => {
    it('throws NotFoundException if conversation does not exist', async () => {
      mockPrisma.aiConversation.findFirst.mockResolvedValue(null);
      await expect(
        service.getConversation(testUserId, testConvId),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns conversation detail with ordered messages', async () => {
      mockPrisma.aiConversation.findFirst.mockResolvedValue({
        id: testConvId,
        userId: testUserId,
        title: 'Training Chat',
        createdAt: new Date('2026-10-10T10:00:00Z'),
        updatedAt: new Date('2026-10-10T10:05:00Z'),
        messages: [
          {
            id: 'm1',
            conversationId: testConvId,
            role: 'user',
            content: 'How was my bench?',
            metadata: null,
            createdAt: new Date('2026-10-10T10:01:00Z'),
          },
          {
            id: 'm2',
            conversationId: testConvId,
            role: 'assistant',
            content: 'Great session!',
            metadata: null,
            createdAt: new Date('2026-10-10T10:02:00Z'),
          },
        ],
      });

      const result = await service.getConversation(testUserId, testConvId);
      expect(result.id).toBe(testConvId);
      expect(result.messages.length).toBe(2);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[1].role).toBe('assistant');
    });
  });

  describe('sendMessage', () => {
    it('checks rate limit, builds context, persists user/assistant messages and updates conversation', async () => {
      mockPrisma.aiConversation.findFirst.mockResolvedValue({
        id: testConvId,
        userId: testUserId,
        title: 'Training Chat',
      });

      mockPrisma.aiMessage.create
        .mockResolvedValueOnce({
          id: 'msg-user-1',
          conversationId: testConvId,
          role: 'user',
          content: 'Should I increase weight next week?',
          metadata: null,
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'msg-asst-1',
          conversationId: testConvId,
          role: 'assistant',
          content: 'Focus on progressive overload with 1-2 RIR in reserve.',
          metadata: { finishReason: 'STOP' },
          createdAt: new Date(),
        });

      mockPrisma.aiMessage.findMany.mockResolvedValue([
        {
          role: 'user',
          content: 'Should I increase weight next week?',
        },
      ]);

      mockPrisma.aiConversation.update.mockResolvedValue({});

      const response = await service.sendMessage(testUserId, testConvId, {
        content: 'Should I increase weight next week?',
      });

      expect(mockRateLimiter.checkAndIncrement).toHaveBeenCalledWith(testUserId);
      expect(mockContextService.buildContext).toHaveBeenCalledWith(testUserId);
      expect(mockAiProvider.generate).toHaveBeenCalled();
      expect(response.userMessage.content).toBe(
        'Should I increase weight next week?',
      );
      expect(response.assistantMessage.content).toBe(
        'Focus on progressive overload with 1-2 RIR in reserve.',
      );
      expect(mockPrisma.aiConversation.update).toHaveBeenCalledWith({
        where: { id: testConvId },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });

  describe('getSuggestedQuestions', () => {
    it('returns dynamic contextual question suggestions', async () => {
      const res = await service.getSuggestedQuestions(testUserId);
      expect(res.suggestions.length).toBeGreaterThanOrEqual(3);
      expect(
        res.suggestions.some((s) => s.category === 'training'),
      ).toBe(true);
      expect(
        res.suggestions.some((s) => s.category === 'nutrition'),
      ).toBe(true);
    });
  });

  describe('getCoachStatus', () => {
    it('returns provider mode, key detection, and remaining daily quota', async () => {
      mockPrisma.aiMessage.count = vi.fn().mockResolvedValue(5);
      mockAiProvider.getStatus = vi.fn().mockReturnValue({
        hasApiKey: true,
        maskedKey: 'AIzaSy...1234',
        model: 'gemini-1.5-flash',
        mode: 'live_gemini',
      });

      const res = await service.getCoachStatus(testUserId);
      expect(res.status).toBe('ok');
      expect(res.hasApiKey).toBe(true);
      expect(res.mode).toBe('live_gemini');
      expect(res.rateLimit.usedToday).toBe(5);
      expect(res.rateLimit.remainingToday).toBe(45);
    });
  });
});
