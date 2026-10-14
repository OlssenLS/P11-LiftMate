import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { GroqAiProvider } from './groq-ai.provider.js';
import { GeminiAiProvider } from './gemini-ai.provider.js';

describe('GroqAiProvider', () => {
  let provider: GroqAiProvider;
  let mockConfigService: any;
  let mockGeminiProvider: any;
  let mockGroqCreate: any;

  beforeEach(() => {
    mockGroqCreate = vi.fn().mockResolvedValue({
      id: 'chatcmpl-test-123',
      choices: [
        {
          message: {
            content: 'Progressive overload means gradually increasing stimulus.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 35,
        completion_tokens: 15,
        total_tokens: 50,
      },
    });

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'GROQ_API_KEY') return 'gsk_test_1234567890abcdef';
        if (key === 'GROQ_MODEL') return 'llama-3.3-70b-versatile';
        if (key === 'GROQ_VISION_MODEL') return 'llama-3.2-11b-vision-preview';
        return undefined;
      }),
    };

    mockGeminiProvider = {
      getStatus: vi.fn().mockReturnValue({
        hasApiKey: true,
        maskedKey: 'AQ.Ab8...FElg',
        model: 'gemini-flash-latest',
        mode: 'live_gemini',
      }),
      generate: vi.fn().mockResolvedValue({
        content: 'Fallback from Gemini',
        finishReason: 'STOP',
        provider: 'gemini-flash-latest',
        isLiveApi: true,
        latencyMs: 120,
      }),
    };

    provider = new GroqAiProvider(
      mockConfigService as unknown as ConfigService,
      mockGeminiProvider as unknown as GeminiAiProvider,
    );

    // Mock internal getClient to intercept groq completions
    (provider as any).getClient = vi.fn().mockReturnValue({
      chat: {
        completions: {
          create: mockGroqCreate,
        },
      },
    });
  });

  describe('getStatus', () => {
    it('reports live_groq mode and masked key when GROQ_API_KEY is configured', () => {
      const status = provider.getStatus();
      expect(status.hasApiKey).toBe(true);
      expect(status.mode).toBe('live_groq');
      expect(status.model).toBe('llama-3.3-70b-versatile');
      expect(status.maskedKey).toBe('gsk_te...cdef');
      expect(status.backupMode).toBe('live_gemini');
    });

    it('falls back to Gemini status when GROQ_API_KEY is not provided', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GROQ_API_KEY') return '';
        return undefined;
      });

      const unconfiguredProvider = new GroqAiProvider(
        mockConfigService as unknown as ConfigService,
        mockGeminiProvider as unknown as GeminiAiProvider,
      );

      const status = unconfiguredProvider.getStatus();
      expect(status.mode).toBe('live_gemini');
      expect(status.hasApiKey).toBe(true);
      expect(status.model).toBe('gemini-flash-latest');
    });
  });

  describe('generate', () => {
    it('calls Groq completions with system prompt and text messages', async () => {
      const result = await provider.generate({
        system: 'You are LiftMate Coach.',
        messages: [{ role: 'user', content: 'What is progressive overload?' }],
        temperature: 0.7,
        maxTokens: 200,
      });

      expect(mockGroqCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockGroqCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('llama-3.3-70b-versatile');
      expect(callArgs.messages).toEqual([
        { role: 'system', content: 'You are LiftMate Coach.' },
        { role: 'user', content: 'What is progressive overload?' },
      ]);
      expect(callArgs.temperature).toBe(0.7);
      expect(callArgs.max_completion_tokens).toBe(200);

      expect(result.content).toBe(
        'Progressive overload means gradually increasing stimulus.',
      );
      expect(result.isLiveApi).toBe(true);
      expect(result.provider).toBe('groq/llama-3.3-70b-versatile');
      expect(result.usage?.totalTokens).toBe(50);
      expect(mockGeminiProvider.generate).not.toHaveBeenCalled();
    });

    it('selects vision model when images are provided', async () => {
      const result = await provider.generate({
        system: 'Food Recognition Agent',
        messages: [{ role: 'user', content: 'Identify this meal.' }],
        images: [{ mimeType: 'image/jpeg', base64: 'data:image/jpeg;base64,abc123xyz' }],
      });

      expect(mockGroqCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockGroqCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('llama-3.2-11b-vision-preview');
      expect(result.provider).toBe('groq/llama-3.2-11b-vision-preview');
    });

    it('falls back to Gemini when Groq API call fails', async () => {
      mockGroqCreate.mockRejectedValue(new Error('Groq 429 Rate Limit Exceeded'));

      const result = await provider.generate({
        system: 'You are LiftMate Coach.',
        messages: [{ role: 'user', content: 'Help me plan leg day' }],
      });

      expect(mockGroqCreate).toHaveBeenCalledTimes(1);
      expect(mockGeminiProvider.generate).toHaveBeenCalledTimes(1);
      expect(result.content).toBe('Fallback from Gemini');
    });

    it('delegates to Gemini immediately if GROQ_API_KEY is not set', async () => {
      mockConfigService.get.mockReturnValue('');

      const noKeyProvider = new GroqAiProvider(
        mockConfigService as unknown as ConfigService,
        mockGeminiProvider as unknown as GeminiAiProvider,
      );

      const result = await noKeyProvider.generate({
        system: 'Coaching',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(mockGeminiProvider.generate).toHaveBeenCalledTimes(1);
      expect(result.content).toBe('Fallback from Gemini');
    });

    it('bypasses external API and delegates demo images to deterministic fallback', async () => {
      await provider.generate({
        system: 'Food recognition',
        messages: [{ role: 'user', content: 'Analyze' }],
        images: [{ mimeType: 'image/jpeg', base64: 'demo_meal_salmon' }],
      });

      expect(mockGroqCreate).not.toHaveBeenCalled();
      expect(mockGeminiProvider.generate).toHaveBeenCalledTimes(1);
    });
  });
});
