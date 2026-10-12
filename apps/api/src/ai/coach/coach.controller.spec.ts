import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoachController } from './coach.controller.js';
import type { AuthUser } from '../../auth/strategies/jwt-access.strategy.js';

describe('CoachController', () => {
  let controller: CoachController;
  let mockCoachService: any;

  const mockUser: AuthUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'test@example.com',
  };

  const testConvId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    mockCoachService = {
      getConversations: vi.fn().mockResolvedValue([]),
      getOrCreateActiveConversation: vi.fn().mockResolvedValue({
        id: testConvId,
        userId: mockUser.id,
        title: 'Active Session',
        messages: [],
      }),
      createConversation: vi.fn().mockResolvedValue({
        id: testConvId,
        userId: mockUser.id,
        title: 'New Session',
        messages: [],
      }),
      getConversation: vi.fn().mockResolvedValue({
        id: testConvId,
        userId: mockUser.id,
        title: 'Session Detail',
        messages: [],
      }),
      sendMessage: vi.fn().mockResolvedValue({
        userMessage: { id: 'm1', content: 'Hello Coach' },
        assistantMessage: { id: 'm2', content: 'Hello! How can I help?' },
      }),
      getSuggestedQuestions: vi.fn().mockResolvedValue({
        suggestions: [
          {
            id: 's1',
            prompt: 'How was my workout?',
            category: 'training',
          },
        ],
      }),
    };

    controller = new CoachController(mockCoachService);
  });

  it('delegates getConversations', async () => {
    await controller.getConversations(mockUser);
    expect(mockCoachService.getConversations).toHaveBeenCalledWith(mockUser.id);
  });

  it('delegates getActiveConversation', async () => {
    const res = await controller.getActiveConversation(mockUser);
    expect(mockCoachService.getOrCreateActiveConversation).toHaveBeenCalledWith(
      mockUser.id,
    );
    expect(res.id).toBe(testConvId);
  });

  it('delegates createConversation', async () => {
    await controller.createConversation(mockUser, { title: 'Test Title' });
    expect(mockCoachService.createConversation).toHaveBeenCalledWith(
      mockUser.id,
      { title: 'Test Title' },
    );
  });

  it('delegates getConversation', async () => {
    await controller.getConversation(mockUser, testConvId);
    expect(mockCoachService.getConversation).toHaveBeenCalledWith(
      mockUser.id,
      testConvId,
    );
  });

  it('delegates sendMessage', async () => {
    await controller.sendMessage(mockUser, testConvId, {
      content: 'Hello Coach',
    });
    expect(mockCoachService.sendMessage).toHaveBeenCalledWith(
      mockUser.id,
      testConvId,
      { content: 'Hello Coach' },
    );
  });

  it('delegates getSuggestedQuestions', async () => {
    const res = await controller.getSuggestedQuestions(mockUser);
    expect(mockCoachService.getSuggestedQuestions).toHaveBeenCalledWith(
      mockUser.id,
    );
    expect(res.suggestions.length).toBe(1);
  });

  it('delegates getStatus', async () => {
    mockCoachService.getCoachStatus = vi.fn().mockResolvedValue({
      status: 'ok',
      hasApiKey: false,
      model: 'gemini-1.5-flash',
      mode: 'deterministic_fallback',
      rateLimit: { dailyLimit: 50, usedToday: 0, remainingToday: 50 },
    });
    const res = await controller.getStatus(mockUser);
    expect(mockCoachService.getCoachStatus).toHaveBeenCalledWith(mockUser.id);
    expect(res.mode).toBe('deterministic_fallback');
  });
});
