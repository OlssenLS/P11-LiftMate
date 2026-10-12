import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProviderGenerateOptions,
  AiProviderGenerateResult,
} from '@liftmate/shared';
import { AiProvider } from './ai-provider.interface.js';

@Injectable()
export class GeminiAiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiAiProvider.name);
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('AI_API_KEY');
    this.model =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';
  }

  getStatus() {
    const hasKey = Boolean(this.apiKey && this.apiKey.trim().length > 5);
    const maskedKey = hasKey
      ? `${this.apiKey!.trim().slice(0, 6)}...${this.apiKey!.trim().slice(-4)}`
      : null;

    return {
      hasApiKey: hasKey,
      maskedKey,
      model: this.model,
      mode: hasKey ? ('live_gemini' as const) : ('deterministic_fallback' as const),
    };
  }

  async generate(
    options: AiProviderGenerateOptions,
  ): Promise<AiProviderGenerateResult> {
    const startTime = Date.now();

    if (this.apiKey && this.apiKey.trim().length > 5) {
      try {
        this.logger.log(`[GeminiAiProvider] 🌐 Calling Google Gemini API (${this.model})...`);
        const result = await this.callGeminiApi(options, startTime);
        this.logger.log(
          `[GeminiAiProvider] ✅ Google Gemini responded in ${result.latencyMs}ms (${result.usage?.totalTokens ?? 0} tokens)`,
        );
        return result;
      } catch (error) {
        this.logger.warn(
          `[GeminiAiProvider] ⚠️ Gemini API call failed (${error instanceof Error ? error.message : String(error)}), falling back to deterministic response`,
        );
      }
    } else {
      this.logger.debug(
        `[GeminiAiProvider] ⚙️ No GEMINI_API_KEY detected in environment; using deterministic fallback engine`,
      );
    }

    const fallbackResult = this.generateDeterministicFallback(options);
    fallbackResult.latencyMs = Date.now() - startTime;
    return fallbackResult;
  }

  private async callGeminiApi(
    options: AiProviderGenerateOptions,
    startTime: number,
  ): Promise<AiProviderGenerateResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const contents = options.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const payload: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1000,
      },
    };

    if (options.system) {
      payload.systemInstruction = {
        parts: [{ text: options.system }],
      };
    }

    let res: Response | null = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        break;
      }

      if (res.status === 503 && attempts < maxAttempts) {
        this.logger.warn(
          `[GeminiAiProvider] 503 Service Unavailable spike, retrying in 1000ms (attempt ${attempts}/${maxAttempts})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const errText = await res.text();
      throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
    }

    if (!res || !res.ok) {
      throw new Error('Gemini API call failed with no response');
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text =
      candidate?.content?.parts?.map((p: any) => p.text).join('\n') || '';

    return {
      content: text,
      finishReason: candidate?.finishReason || 'STOP',
      provider: this.model,
      isLiveApi: true,
      latencyMs: Date.now() - startTime,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
    };
  }

  private generateDeterministicFallback(
    options: AiProviderGenerateOptions,
  ): AiProviderGenerateResult {
    const lastUserMsg =
      [...options.messages].reverse().find((m) => m.role === 'user')?.content ||
      '';
    const lower = lastUserMsg.toLowerCase();
    const system = options.system || '';

    // Safety checks for medical / pain inquiries (§43, §68)
    if (
      lower.includes('pain') ||
      lower.includes('hurt') ||
      lower.includes('injury') ||
      lower.includes('doctor') ||
      lower.includes('sore knee') ||
      lower.includes('shoulder tweak')
    ) {
      return {
        content:
          'Safety notice: LiftMate AI provides training information and is not a substitute for medical diagnosis. If you are experiencing persistent, sharp, or joint pain, please stop the movement immediately and consult a qualified healthcare professional or physical therapist. In the meantime, focus on pain-free ranges of motion and adequate rest.',
        finishReason: 'SAFETY_DISCLAIMER',
      };
    }

    // Nutrition questions
    if (
      lower.includes('protein') ||
      lower.includes('calorie') ||
      lower.includes('macro') ||
      lower.includes('food') ||
      lower.includes('eat')
    ) {
      const matchNutrition = system.match(/Daily Nutrition Targets: (.*?)(?:\n|$)/);
      const matchLogged = system.match(/Today's Logged Nutrition: (.*?)(?:\n|$)/);

      let reply = 'Regarding your nutrition: ';
      if (matchLogged && !matchLogged[1].includes('No meals logged')) {
        reply += `According to your logs for today, you have recorded ${matchLogged[1]}. `;
      } else {
        reply += 'You have not logged any meals yet today. ';
      }

      if (matchNutrition) {
        reply += `Your configured daily target is ${matchNutrition[1]}. `;
      }

      reply +=
        'Aim to spread your protein evenly across 3 to 4 meals to optimize muscle protein synthesis. Ensure you stay well hydrated throughout your workouts.';
      return { content: reply, finishReason: 'STOP' };
    }

    // Workout / volume / overload questions
    if (
      lower.includes('volume') ||
      lower.includes('workout') ||
      lower.includes('bench') ||
      lower.includes('squat') ||
      lower.includes('progress') ||
      lower.includes('reps')
    ) {
      const matchProgram = system.match(/Active Program: (.*?)(?:\n|$)/);
      const matchWorkouts = system.match(/Recent Workouts \((.*?)\):/);

      let reply = 'Analyzing your training progress: ';
      if (matchProgram) {
        reply += `You are currently on "${matchProgram[1]}". `;
      }

      if (matchWorkouts) {
        reply +=
          'Based on your recorded sessions, your working set volume and RIR indications show consistent training stimulus. ';
      } else {
        reply +=
          'You do not have enough recent workouts logged yet to calculate weekly progression trends. ';
      }

      reply +=
        'For progressive overload, focus on adding either 1 rep or small weight increments (1-2.5 kg) once you reach the top of your target rep range with 1-2 RIR in reserve.';
      return { content: reply, finishReason: 'STOP' };
    }

    // Weight questions
    if (lower.includes('weight') || lower.includes('scale')) {
      const matchWeight = system.match(/Current Weight: (.*?)(?:\n|$)/);
      const matchTarget = system.match(/Target Weight: (.*?)(?:\n|$)/);

      let reply = 'Here is your body weight overview: ';
      if (matchWeight) {
        reply += `Your latest recorded weight is ${matchWeight[1]}. `;
      }
      if (matchTarget) {
        reply += `Your goal target is ${matchTarget[1]}. `;
      }
      reply +=
        'Keep in mind that day-to-day scale fluctuations are normal due to water retention and glycogen levels. Track your 7-day rolling average for a clear trend.';
      return { content: reply, finishReason: 'STOP' };
    }

    // General fallback
    return {
      content:
        'I am your LiftMate Coach. I can analyze your logged workouts, calculate weekly training volume, review your daily macro targets, and suggest progressive overload adjustments. Feel free to ask about your recent sessions, nutrition progress, or next planned workout!',
      finishReason: 'STOP',
    };
  }
}
