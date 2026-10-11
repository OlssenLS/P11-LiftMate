import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FoodLogsController } from './food-logs.controller.js';
import type { FoodLogsService } from './food-logs.service.js';
import type { AuthUser } from '../auth/strategies/jwt-access.strategy.js';

describe('FoodLogsController', () => {
  let controller: FoodLogsController;
  let foodLogsServiceMock: any;

  const mockUser: AuthUser = {
    id: 'user-uuid-1',
    email: 'user@example.com',
  };

  beforeEach(() => {
    foodLogsServiceMock = {
      getDailySummary: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    controller = new FoodLogsController(foodLogsServiceMock as unknown as FoodLogsService);
  });

  it('delegates getDailySummary to FoodLogsService with authenticated user id and date', async () => {
    foodLogsServiceMock.getDailySummary.mockResolvedValue({ date: '2026-10-11' });
    const res = await controller.getDailySummary(mockUser, '2026-10-11');
    expect(res.date).toBe('2026-10-11');
    expect(foodLogsServiceMock.getDailySummary).toHaveBeenCalledWith('user-uuid-1', '2026-10-11');
  });

  it('delegates create to FoodLogsService with authenticated user id', async () => {
    const input: any = {
      foodName: 'Dada Ayam',
      servingSize: '100g',
      quantity: 1,
      mealType: 'lunch',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      source: 'database',
    };
    foodLogsServiceMock.create.mockResolvedValue({ id: 'log-1', ...input });
    const res = await controller.create(mockUser, input);
    expect(res.id).toBe('log-1');
    expect(foodLogsServiceMock.create).toHaveBeenCalledWith('user-uuid-1', input);
  });

  it('delegates update to FoodLogsService with user id, log id, and input', async () => {
    const updateInput: any = { quantity: 2 };
    foodLogsServiceMock.update.mockResolvedValue({ id: 'log-1', quantity: 2 });
    const res = await controller.update(mockUser, 'log-1', updateInput);
    expect(res.quantity).toBe(2);
    expect(foodLogsServiceMock.update).toHaveBeenCalledWith('user-uuid-1', 'log-1', updateInput);
  });

  it('delegates delete to FoodLogsService', async () => {
    foodLogsServiceMock.delete.mockResolvedValue({ success: true });
    const res = await controller.delete(mockUser, 'log-1');
    expect(res.success).toBe(true);
    expect(foodLogsServiceMock.delete).toHaveBeenCalledWith('user-uuid-1', 'log-1');
  });
});
