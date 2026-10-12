import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FoodRecognitionController } from './food-recognition.controller.js';
import type { AuthUser } from '../../auth/strategies/jwt-access.strategy.js';
import type { RecognizeFoodResponse, FoodLog } from '@liftmate/shared';

describe('FoodRecognitionController', () => {
  let controller: FoodRecognitionController;
  let serviceMock: {
    recognizeFood: ReturnType<typeof vi.fn>;
    confirmFood: ReturnType<typeof vi.fn>;
  };

  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'user@example.com',
  };

  beforeEach(() => {
    serviceMock = {
      recognizeFood: vi.fn(),
      confirmFood: vi.fn(),
    };
    controller = new FoodRecognitionController(serviceMock as any);
  });

  it('delegates recognize request to FoodRecognitionService', async () => {
    const mockResponse: RecognizeFoodResponse = {
      imageSummary: 'Plate of food',
      items: [],
      overallConfidence: 'high',
      hasLowConfidenceWarning: false,
      warningMessage: null,
      totalEstimatedCalories: 250,
      totalEstimatedProtein: 20,
      totalEstimatedCarbs: 30,
      totalEstimatedFat: 5,
      isEstimated: true,
    };
    serviceMock.recognizeFood.mockResolvedValue(mockResponse);

    const res = await controller.recognize(mockUser, {
      imageBase64: 'base64str',
      mimeType: 'image/jpeg',
    });

    expect(serviceMock.recognizeFood).toHaveBeenCalledWith('user-1', {
      imageBase64: 'base64str',
      mimeType: 'image/jpeg',
    });
    expect(res).toBe(mockResponse);
  });

  it('delegates confirm request to FoodRecognitionService', async () => {
    const mockLogs: FoodLog[] = [];
    serviceMock.confirmFood.mockResolvedValue(mockLogs);

    const res = await controller.confirm(mockUser, {
      mealType: 'lunch',
      loggedAt: new Date(),
      items: [
        {
          foodId: 'food-1',
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

    expect(serviceMock.confirmFood).toHaveBeenCalledWith('user-1', expect.any(Object));
    expect(res).toBe(mockLogs);
  });
});
