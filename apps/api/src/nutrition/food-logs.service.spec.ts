import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FoodLogsService, MealType } from './food-logs.service.js';
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('FoodLogsService', () => {
  let service: FoodLogsService;
  let prismaMock: any;

  const mockUserId = 'user-uuid-1';

  beforeEach(() => {
    prismaMock = {
      userPreferences: {
        findUnique: vi.fn(),
      },
      foodLog: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new FoodLogsService(prismaMock as unknown as PrismaService);
  });

  describe('getDailySummary', () => {
    it('aggregates daily totals, respects user preferences, and groups by meal', async () => {
      prismaMock.userPreferences.findUnique.mockResolvedValue({
        targetCalories: 2200,
        targetProtein: 160,
        targetCarbs: 220,
        targetFat: 70,
      });

      prismaMock.foodLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          userId: mockUserId,
          foodId: 'food-1',
          foodName: 'Oatmeal',
          servingSize: '40g',
          quantity: '1.0',
          mealType: MealType.breakfast,
          loggedAt: new Date('2026-10-11T08:00:00Z'),
          calories: '150.00',
          protein: '5.00',
          carbs: '27.00',
          fat: '2.50',
          source: 'database',
          notes: null,
          food: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'log-2',
          userId: mockUserId,
          foodId: 'food-2',
          foodName: 'Chicken Breast',
          servingSize: '100g',
          quantity: '2.0',
          mealType: MealType.lunch,
          loggedAt: new Date('2026-10-11T12:30:00Z'),
          calories: '330.00',
          protein: '62.00',
          carbs: '0.00',
          fat: '7.20',
          source: 'database',
          notes: null,
          food: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]);

      const summary = await service.getDailySummary(mockUserId, '2026-10-11');

      expect(summary.date).toBe('2026-10-11');
      expect(summary.totals.calories).toBe(480);
      expect(summary.totals.protein).toBe(67);
      expect(summary.totals.carbs).toBe(27);
      expect(summary.totals.fat).toBe(9.7);

      expect(summary.targets.calories).toBe(2200);
      expect(summary.targets.protein).toBe(160);

      expect(summary.remaining.calories).toBe(1720);
      expect(summary.remaining.protein).toBe(93);

      expect(summary.progressPct.calories).toBe(Math.round((480 / 2200) * 100));

      expect(summary.meals).toHaveLength(4);
      const breakfast = summary.meals.find((m) => m.mealType === 'breakfast');
      expect(breakfast?.items).toHaveLength(1);
      expect(breakfast?.totals.calories).toBe(150);

      const lunch = summary.meals.find((m) => m.mealType === 'lunch');
      expect(lunch?.items).toHaveLength(1);
      expect(lunch?.totals.calories).toBe(330);

      const dinner = summary.meals.find((m) => m.mealType === 'dinner');
      expect(dinner?.items).toHaveLength(0);
      expect(dinner?.totals.calories).toBe(0);
    });

    it('falls back to default targets if user preferences are null', async () => {
      prismaMock.userPreferences.findUnique.mockResolvedValue(null);
      prismaMock.foodLog.findMany.mockResolvedValue([]);

      const summary = await service.getDailySummary(mockUserId, '2026-10-11');
      expect(summary.targets.calories).toBe(2000);
      expect(summary.targets.protein).toBe(150);
      expect(summary.totals.calories).toBe(0);
      expect(summary.remaining.calories).toBe(2000);
    });
  });

  describe('create', () => {
    it('creates or upserts a food log item idempotently', async () => {
      prismaMock.foodLog.upsert.mockImplementation((args: any) => ({
        ...args.create,
        quantity: args.create.quantity,
        calories: args.create.calories,
        protein: args.create.protein,
        carbs: args.create.carbs,
        fat: args.create.fat,
        food: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }));

      const input = {
        id: 'client-uuid-1',
        foodName: 'Telur Rebus',
        servingSize: '2 butir',
        quantity: 2,
        mealType: 'breakfast' as const,
        loggedAt: new Date('2026-10-11T07:30:00Z'),
        calories: 156,
        protein: 12.6,
        carbs: 1.2,
        fat: 10.6,
        source: 'database',
      };

      const result = await service.create(mockUserId, input);
      expect(result.id).toBe('client-uuid-1');
      expect(result.calories).toBe(156);
      expect(prismaMock.foodLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'client-uuid-1' },
        }),
      );
    });
  });

  describe('update', () => {
    it('updates existing food log entry', async () => {
      prismaMock.foodLog.findFirst.mockResolvedValue({
        id: 'log-1',
        userId: mockUserId,
        deletedAt: null,
      });

      prismaMock.foodLog.update.mockResolvedValue({
        id: 'log-1',
        userId: mockUserId,
        foodId: null,
        foodName: 'Telur Rebus',
        servingSize: '3 butir',
        quantity: 3,
        mealType: MealType.breakfast,
        loggedAt: new Date(),
        calories: 234,
        protein: 18.9,
        carbs: 1.8,
        fat: 15.9,
        source: 'database',
        notes: 'Extra egg',
        food: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const updated = await service.update(mockUserId, 'log-1', {
        quantity: 3,
        calories: 234,
      });

      expect(updated.quantity).toBe(3);
      expect(updated.calories).toBe(234);
    });

    it('throws NotFoundException when entry does not belong to user or is missing', async () => {
      prismaMock.foodLog.findFirst.mockResolvedValue(null);
      await expect(
        service.update(mockUserId, 'log-missing', { quantity: 2 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('soft deletes the food log entry', async () => {
      prismaMock.foodLog.findFirst.mockResolvedValue({
        id: 'log-1',
        userId: mockUserId,
        deletedAt: null,
      });
      prismaMock.foodLog.update.mockResolvedValue({});

      const res = await service.delete(mockUserId, 'log-1');
      expect(res.success).toBe(true);
      expect(prismaMock.foodLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('throws NotFoundException when deleting non-existent entry', async () => {
      prismaMock.foodLog.findFirst.mockResolvedValue(null);
      await expect(service.delete(mockUserId, 'log-missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
