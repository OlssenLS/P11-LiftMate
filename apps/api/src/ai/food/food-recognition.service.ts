import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import {
  type AiProvider,
  AI_PROVIDER,
} from '../provider/ai-provider.interface.js';
import { FoodsService } from '../../nutrition/foods.service.js';
import { FoodLogsService } from '../../nutrition/food-logs.service.js';
import { AiRateLimiterService } from '../ai-rate-limiter.service.js';
import type {
  RecognizeFoodInput,
  RecognizeFoodResponse,
  RecognizedFoodItem,
  ConfirmFoodRecognitionInput,
  FoodLog,
} from '@liftmate/shared';
import { randomUUID } from 'node:crypto';

@Injectable()
export class FoodRecognitionService {
  private readonly logger = new Logger(FoodRecognitionService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly foodsService: FoodsService,
    private readonly foodLogsService: FoodLogsService,
    private readonly rateLimiter: AiRateLimiterService,
  ) {}

  async recognizeFood(
    userId: string,
    input: RecognizeFoodInput,
  ): Promise<RecognizeFoodResponse> {
    // Check daily rate limit cap
    await this.rateLimiter.checkAndIncrement(userId);

    let cleanBase64 = input.imageBase64.trim();
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    if (cleanBase64.startsWith('demo_') || cleanBase64 === 'demo_sample_food_base64_payload') {
      return this.generateDemoResponse();
    }

    const systemPrompt = `You are an expert Indonesian and international nutrition vision assistant.
Analyze the meal photo and identify all distinct food items present.
For each item, estimate the portion size in grams (portionGrams) and assess your confidence ('high', 'medium', or 'low').
Return ONLY a valid JSON object matching this schema:
{
  "summary": "Brief 1-sentence description of the meal",
  "items": [
    { "foodName": "Food name (e.g., Nasi Putih, Dada Ayam Panggang, Telur Rebus, Tempe Goreng, Tahu, Pisang)", "portionGrams": 150, "confidence": "high" }
  ],
  "overallConfidence": "high" | "medium" | "low"
}
Do NOT include markdown backticks or any conversational text.`;

    const aiRes = await this.aiProvider.generate({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Identify all visible food items, portion sizes in grams, and confidence from this image.',
        },
      ],
      images: [
        {
          mimeType: input.mimeType || 'image/jpeg',
          base64: cleanBase64,
        },
      ],
      temperature: 0.2,
      maxTokens: 1000,
    });

    let parsed: {
      summary?: string;
      items?: Array<{ foodName: string; portionGrams: number; confidence: 'high' | 'medium' | 'low' }>;
      overallConfidence?: 'high' | 'medium' | 'low';
    };

    try {
      const cleaned = aiRes.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (err) {
      this.logger.warn(`Failed to parse AI vision output: ${aiRes.content}. Using fallback defaults.`);
      parsed = {
        summary: 'Detected meal plate',
        items: [{ foodName: 'Nasi Putih', portionGrams: 200, confidence: 'medium' }],
        overallConfidence: 'medium',
      };
    }

    const detectedItems = Array.isArray(parsed.items) && parsed.items.length > 0
      ? parsed.items
      : [{ foodName: 'Nasi Putih', portionGrams: 200, confidence: 'low' as const }];

    const recognizedItems: RecognizedFoodItem[] = [];
    let hasLowConfidence = parsed.overallConfidence === 'low';

    for (const item of detectedItems) {
      const portionGrams = Math.max(10, Math.round(Number(item.portionGrams) || 100));
      const confidence = (item.confidence === 'high' || item.confidence === 'medium' || item.confidence === 'low')
        ? item.confidence
        : 'medium';

      if (confidence === 'low') {
        hasLowConfidence = true;
      }

      // Match against food database (Brief §4 rule 11: Nutrition numbers come from food DB, never from LLM free text)
      const matchedFood = await this.findBestDatabaseMatch(item.foodName);

      if (matchedFood) {
        // Compute nutrition from database serving weight
        const servingWeightG = matchedFood.servingWeightG && matchedFood.servingWeightG > 0
          ? matchedFood.servingWeightG
          : 100;
        const multiplier = portionGrams / servingWeightG;

        recognizedItems.push({
          id: randomUUID(),
          detectedName: item.foodName,
          matchedFoodId: matchedFood.id,
          matchedFoodName: matchedFood.name,
          servingSize: matchedFood.servingSize,
          servingWeightG: matchedFood.servingWeightG,
          portionGrams,
          calories: Math.round(matchedFood.calories * multiplier),
          protein: Math.round(matchedFood.protein * multiplier * 10) / 10,
          carbs: Math.round(matchedFood.carbs * multiplier * 10) / 10,
          fat: Math.round(matchedFood.fat * multiplier * 10) / 10,
          confidence,
          source: 'ai_recognition',
        });
      } else {
        // Fallback estimated entry if not found in catalog (flagged as low confidence)
        hasLowConfidence = true;
        recognizedItems.push({
          id: randomUUID(),
          detectedName: item.foodName,
          matchedFoodId: null,
          matchedFoodName: item.foodName,
          servingSize: `${portionGrams}g portion`,
          servingWeightG: portionGrams,
          portionGrams,
          calories: Math.round(portionGrams * 1.5),
          protein: Math.round(portionGrams * 0.1 * 10) / 10,
          carbs: Math.round(portionGrams * 0.15 * 10) / 10,
          fat: Math.round(portionGrams * 0.05 * 10) / 10,
          confidence: 'low',
          source: 'ai_recognition',
        });
      }
    }

    const totalEstimatedCalories = recognizedItems.reduce((acc, it) => acc + it.calories, 0);
    const totalEstimatedProtein = Math.round(recognizedItems.reduce((acc, it) => acc + it.protein, 0) * 10) / 10;
    const totalEstimatedCarbs = Math.round(recognizedItems.reduce((acc, it) => acc + it.carbs, 0) * 10) / 10;
    const totalEstimatedFat = Math.round(recognizedItems.reduce((acc, it) => acc + it.fat, 0) * 10) / 10;

    const overallConfidence: 'high' | 'medium' | 'low' = hasLowConfidence
      ? 'low'
      : (parsed.overallConfidence ?? 'medium');

    return {
      imageSummary: parsed.summary || 'Detected food items from meal photo',
      items: recognizedItems,
      overallConfidence,
      hasLowConfidenceWarning: hasLowConfidence || overallConfidence === 'low',
      warningMessage: (hasLowConfidence || overallConfidence === 'low')
        ? 'Food identification may be inaccurate. Please verify the detected food and portion.'
        : null,
      totalEstimatedCalories,
      totalEstimatedProtein,
      totalEstimatedCarbs,
      totalEstimatedFat,
      isEstimated: true,
    };
  }

  async confirmFood(
    userId: string,
    input: ConfirmFoodRecognitionInput,
  ): Promise<FoodLog[]> {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('At least one food item must be confirmed');
    }

    const loggedAt = input.loggedAt ? new Date(input.loggedAt) : new Date();
    const createdLogs: FoodLog[] = [];

    for (const item of input.items) {
      const log = await this.foodLogsService.create(userId, {
        foodId: item.foodId ?? undefined,
        foodName: item.foodName,
        servingSize: item.servingSize || `${item.portionGrams}g`,
        quantity: 1,
        mealType: input.mealType,
        loggedAt,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        source: 'ai_recognition',
      });
      createdLogs.push(log);
    }

    return createdLogs;
  }

  private async findBestDatabaseMatch(name: string) {
    const rawMatches = await this.foodsService.search(name, 5);
    if (rawMatches.length > 0) {
      return rawMatches[0];
    }

    // Try token matches
    const tokens = name.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    for (const token of tokens) {
      const tokenMatches = await this.foodsService.search(token, 5);
      if (tokenMatches.length > 0) {
        return tokenMatches[0];
      }
    }

    // Common Indonesian food synonym mapping
    const synonyms: Record<string, string> = {
      rice: 'nasi',
      chicken: 'ayam',
      egg: 'telur',
      beef: 'sapi',
      tofu: 'tahu',
      tempeh: 'tempe',
      fish: 'ikan',
      oat: 'oatmeal',
      banana: 'pisang',
      bread: 'roti',
    };

    for (const [en, id] of Object.entries(synonyms)) {
      if (name.toLowerCase().includes(en)) {
        const synMatches = await this.foodsService.search(id, 5);
        if (synMatches.length > 0) {
          return synMatches[0];
        }
      }
    }

    return null;
  }

  private async generateDemoResponse(): Promise<RecognizeFoodResponse> {
    const demoItems = [
      { foodName: 'Nasi Putih', portionGrams: 200, confidence: 'high' as const },
      { foodName: 'Dada Ayam Panggang / Rebus', portionGrams: 150, confidence: 'high' as const },
      { foodName: 'Telur Ayam Rebus', portionGrams: 50, confidence: 'medium' as const },
    ];

    const recognizedItems: RecognizedFoodItem[] = [];

    for (const item of demoItems) {
      const matched = await this.findBestDatabaseMatch(item.foodName);
      if (matched) {
        const servingWeightG =
          matched.servingWeightG && matched.servingWeightG > 0
            ? matched.servingWeightG
            : 100;
        const multiplier = item.portionGrams / servingWeightG;

        recognizedItems.push({
          id: randomUUID(),
          detectedName: item.foodName,
          matchedFoodId: matched.id,
          matchedFoodName: matched.name,
          servingSize: matched.servingSize,
          servingWeightG: matched.servingWeightG,
          portionGrams: item.portionGrams,
          calories: Math.round(matched.calories * multiplier),
          protein: Math.round(matched.protein * multiplier * 10) / 10,
          carbs: Math.round(matched.carbs * multiplier * 10) / 10,
          fat: Math.round(matched.fat * multiplier * 10) / 10,
          confidence: item.confidence,
          source: 'ai_recognition',
        });
      }
    }

    const totalEstimatedCalories = recognizedItems.reduce((acc, it) => acc + it.calories, 0);
    const totalEstimatedProtein = Math.round(recognizedItems.reduce((acc, it) => acc + it.protein, 0) * 10) / 10;
    const totalEstimatedCarbs = Math.round(recognizedItems.reduce((acc, it) => acc + it.carbs, 0) * 10) / 10;
    const totalEstimatedFat = Math.round(recognizedItems.reduce((acc, it) => acc + it.fat, 0) * 10) / 10;

    return {
      imageSummary: 'Balanced high-protein meal with steamed white rice, grilled chicken breast, and boiled egg.',
      items: recognizedItems,
      overallConfidence: 'high',
      hasLowConfidenceWarning: false,
      warningMessage: null,
      totalEstimatedCalories,
      totalEstimatedProtein,
      totalEstimatedCarbs,
      totalEstimatedFat,
      isEstimated: true,
    };
  }
}

