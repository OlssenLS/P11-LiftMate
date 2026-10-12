import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FoodRecognitionService } from './food-recognition.service.js';
import type { Food, FoodLog } from '@liftmate/shared';

describe('FoodRecognitionService', () => {
  let service: FoodRecognitionService;
  let aiProviderMock: { generate: ReturnType<typeof vi.fn> };
  let foodsServiceMock: { search: ReturnType<typeof vi.fn> };
  let foodLogsServiceMock: { create: ReturnType<typeof vi.fn> };
  let rateLimiterMock: { checkAndIncrement: ReturnType<typeof vi.fn> };

  const mockDbFood: Food = {
    id: 'food-uuid-1',
    name: 'Nasi Putih',
    servingSize: '1 porsi sedang (100g)',
    servingUnit: 'g',
    servingWeightG: 100,
    calories: 130,
    protein: 2.7,
    carbs: 28.2,
    fat: 0.3,
    source: 'verified',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    aiProviderMock = {
      generate: vi.fn(),
    };
    foodsServiceMock = {
      search: vi.fn(),
    };
    foodLogsServiceMock = {
      create: vi.fn(),
    };
    rateLimiterMock = {
      checkAndIncrement: vi.fn().mockResolvedValue({ remaining: 49 }),
    };

    service = new FoodRecognitionService(
      aiProviderMock as any,
      foodsServiceMock as any,
      foodLogsServiceMock as any,
      rateLimiterMock as any,
    );
  });

  describe('recognizeFood', () => {
    it('analyzes image, matches database items, and computes accurate nutrition', async () => {
      aiProviderMock.generate.mockResolvedValue({
        content: JSON.stringify({
          summary: 'A plate of white rice and chicken',
          items: [
            { foodName: 'Nasi Putih', portionGrams: 200, confidence: 'high' },
          ],
          overallConfidence: 'high',
        }),
        finishReason: 'STOP',
      });

      foodsServiceMock.search.mockResolvedValue([mockDbFood]);

      const result = await service.recognizeFood('user-1', {
        imageBase64: 'fake-base64',
        mimeType: 'image/jpeg',
      });

      expect(rateLimiterMock.checkAndIncrement).toHaveBeenCalledWith('user-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].matchedFoodId).toBe('food-uuid-1');
      expect(result.items[0].portionGrams).toBe(200);
      // 200g is 2x 100g serving: 130 * 2 = 260 kcal
      expect(result.items[0].calories).toBe(260);
      expect(result.items[0].protein).toBe(5.4);
      expect(result.isEstimated).toBe(true);
      expect(result.totalEstimatedCalories).toBe(260);
      expect(result.overallConfidence).toBe('high');
      expect(result.hasLowConfidenceWarning).toBe(false);
      expect(result.warningMessage).toBeNull();
    });

    it('enforces low confidence warning when confidence is low per Spec §32', async () => {
      aiProviderMock.generate.mockResolvedValue({
        content: JSON.stringify({
          summary: 'An unclear soup dish',
          items: [
            { foodName: 'Sup Tidak Dikenal', portionGrams: 150, confidence: 'low' },
          ],
          overallConfidence: 'low',
        }),
        finishReason: 'STOP',
      });

      foodsServiceMock.search.mockResolvedValue([]);

      const result = await service.recognizeFood('user-1', {
        imageBase64: 'fake-base64',
        mimeType: 'image/jpeg',
      });

      expect(result.hasLowConfidenceWarning).toBe(true);
      expect(result.warningMessage).toBe(
        'Food identification may be inaccurate. Please verify the detected food and portion.',
      );
    });

    it('falls back gracefully when AI returns non-JSON text', async () => {
      aiProviderMock.generate.mockResolvedValue({
        content: 'I see some food here.',
        finishReason: 'STOP',
      });

      foodsServiceMock.search.mockResolvedValue([mockDbFood]);

      const result = await service.recognizeFood('user-1', {
        imageBase64: 'fake-base64',
        mimeType: 'image/jpeg',
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.isEstimated).toBe(true);
    });

    it('returns fast-path demo response for demo payload without calling AI provider', async () => {
      foodsServiceMock.search.mockResolvedValue([mockDbFood]);

      const result = await service.recognizeFood('user-1', {
        imageBase64: 'demo_sample_food_base64_payload',
        mimeType: 'image/jpeg',
      });

      expect(aiProviderMock.generate).not.toHaveBeenCalled();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.overallConfidence).toBe('high');
      expect(result.isEstimated).toBe(true);
    });
  });

  describe('confirmFood', () => {
    it('persists confirmed items via foodLogsService with source ai_recognition', async () => {
      const mockCreatedLog: FoodLog = {
        id: 'log-1',
        userId: 'user-1',
        foodId: 'food-uuid-1',
        foodName: 'Nasi Putih',
        servingSize: '200g portion',
        quantity: 1,
        mealType: 'lunch',
        loggedAt: new Date(),
        calories: 260,
        protein: 5.4,
        carbs: 56.4,
        fat: 0.6,
        source: 'ai_recognition',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      foodLogsServiceMock.create.mockResolvedValue(mockCreatedLog);

      const logs = await service.confirmFood('user-1', {
        mealType: 'lunch',
        loggedAt: new Date(),
        items: [
          {
            foodId: 'food-uuid-1',
            foodName: 'Nasi Putih',
            servingSize: '200g portion',
            portionGrams: 200,
            calories: 260,
            protein: 5.4,
            carbs: 56.4,
            fat: 0.6,
          },
        ],
      });

      expect(foodLogsServiceMock.create).toHaveBeenCalledTimes(1);
      expect(foodLogsServiceMock.create).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          foodName: 'Nasi Putih',
          calories: 260,
          source: 'ai_recognition',
          mealType: 'lunch',
        }),
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe('log-1');
    });

    it('throws BadRequestException if no items provided', async () => {
      await expect(
        service.confirmFood('user-1', {
          mealType: 'lunch',
          loggedAt: new Date(),
          items: [],
        }),
      ).rejects.toThrow();
    });
  });
});
