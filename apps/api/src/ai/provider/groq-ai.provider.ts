import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import {
  AiImagePart,
  AiProviderGenerateOptions,
  AiProviderGenerateResult,
} from '@liftmate/shared';
import { AiProvider } from './ai-provider.interface.js';
import { GeminiAiProvider } from './gemini-ai.provider.js';

@Injectable()
export class GroqAiProvider implements AiProvider {
  private readonly logger = new Logger(GroqAiProvider.name);
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly visionModel: string;
  private groqClient?: Groq;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiProvider: GeminiAiProvider,
  ) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY');
    this.model =
      this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
    this.visionModel =
      this.configService.get<string>('GROQ_VISION_MODEL') ||
      'llama-3.2-11b-vision-preview';
  }

  private getClient(): Groq {
    if (!this.groqClient) {
      this.groqClient = new Groq({ apiKey: this.apiKey });
    }
    return this.groqClient;
  }

  getStatus() {
    const hasGroqKey = Boolean(this.apiKey && this.apiKey.trim().length > 5);
    const geminiStatus = this.geminiProvider.getStatus();

    if (hasGroqKey) {
      const maskedKey = `${this.apiKey!.trim().slice(0, 6)}...${this.apiKey!.trim().slice(-4)}`;
      return {
        hasApiKey: true,
        maskedKey,
        model: this.model,
        mode: 'live_groq' as const,
        backupMode: geminiStatus.mode,
        backupModel: geminiStatus.model,
      };
    }

    return {
      hasApiKey: geminiStatus.hasApiKey,
      maskedKey: geminiStatus.maskedKey,
      model: geminiStatus.model,
      mode: geminiStatus.mode,
      backupMode: 'deterministic_fallback' as const,
      backupModel: null,
    };
  }

  async generate(
    options: AiProviderGenerateOptions,
  ): Promise<AiProviderGenerateResult> {
    const startTime = Date.now();

    const hasDemoImage =
      options.images?.some((img) => img.base64.startsWith('demo_')) ||
      options.messages.some((m) =>
        m.images?.some((img) => img.base64.startsWith('demo_')),
      );

    if (hasDemoImage) {
      this.logger.log(
        '[GroqAiProvider] 🧪 Demo image detected; returning deterministic meal without external API call',
      );
      return this.geminiProvider.generate(options);
    }

    const hasGroqKey = Boolean(this.apiKey && this.apiKey.trim().length > 5);

    if (hasGroqKey) {
      try {
        this.logger.log(
          `[GroqAiProvider] ⚡ Calling primary provider Groq API (${this.model})...`,
        );
        const result = await this.callGroqApi(options, startTime);
        this.logger.log(
          `[GroqAiProvider] ✅ Groq responded in ${result.latencyMs}ms (${result.usage?.totalTokens ?? 0} tokens)`,
        );
        return result;
      } catch (error) {
        this.logger.warn(
          `[GroqAiProvider] ⚠️ Groq API call failed (${error instanceof Error ? error.message : String(error)}), falling back to secondary provider (Gemini)...`,
        );
        return this.geminiProvider.generate(options);
      }
    }

    this.logger.debug(
      '[GroqAiProvider] ⚙️ No GROQ_API_KEY detected in environment; falling back to secondary provider (Gemini)',
    );
    return this.geminiProvider.generate(options);
  }

  private async callGroqApi(
    options: AiProviderGenerateOptions,
    startTime: number,
  ): Promise<AiProviderGenerateResult> {
    const cleanBase64 = (raw: string) => {
      const trimmed = raw.trim();
      return trimmed.includes(',') ? trimmed.split(',')[1] : trimmed;
    };

    const hasMessageImages = options.messages.some(
      (m) => m.images && m.images.length > 0,
    );
    const hasTopLevelImages = Boolean(
      options.images && options.images.length > 0,
    );
    const hasImages = hasMessageImages || hasTopLevelImages;

    const selectedModel = hasImages ? this.visionModel : this.model;
    const client = this.getClient();

    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: any;
    }> = [];

    if (options.system && options.system.trim().length > 0) {
      messages.push({
        role: 'system',
        content: options.system,
      });
    }

    for (const msg of options.messages) {
      const role = msg.role === 'assistant' ? 'assistant' : 'user';

      if (msg.images && msg.images.length > 0) {
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ type: 'text', text: msg.content });
        }
        for (const img of msg.images) {
          const mimeType = img.mimeType || 'image/jpeg';
          parts.push({
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${cleanBase64(img.base64)}`,
            },
          });
        }
        messages.push({ role, content: parts });
      } else {
        messages.push({ role, content: msg.content });
      }
    }

    if (hasTopLevelImages) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      const imageParts = (options.images as AiImagePart[]).map((img) => ({
        type: 'image_url',
        image_url: {
          url: `data:${img.mimeType || 'image/jpeg'};base64,${cleanBase64(img.base64)}`,
        },
      }));

      if (lastUserMsg) {
        if (typeof lastUserMsg.content === 'string') {
          lastUserMsg.content = [
            { type: 'text', text: lastUserMsg.content },
            ...imageParts,
          ];
        } else if (Array.isArray(lastUserMsg.content)) {
          lastUserMsg.content.push(...imageParts);
        }
      } else {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: 'Please analyze this image.' },
            ...imageParts,
          ],
        });
      }
    }

    const completion = await client.chat.completions.create({
      model: selectedModel,
      messages: messages as any,
      temperature: options.temperature ?? 0.7,
      max_completion_tokens: options.maxTokens ?? 1000,
    });

    const choice = completion.choices?.[0];
    const text = choice?.message?.content || '';

    return {
      content: text,
      finishReason: choice?.finish_reason || 'stop',
      provider: `groq/${selectedModel}`,
      isLiveApi: true,
      latencyMs: Date.now() - startTime,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }
}
