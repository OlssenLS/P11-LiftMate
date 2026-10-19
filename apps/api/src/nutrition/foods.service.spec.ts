import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FoodsService, FoodSource } from './foods.service.js';
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('FoodsService', () => {
  let service: FoodsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      food: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    service = new FoodsService(prismaMock as unknown as PrismaService);
  });

  describe('search', () => {
    it('returns empty array when no matches found', async () => {
      prismaMock.food.findMany.mockResolvedValue([]);
      const results = await service.search('unknown-food');
      expect(results).toEqual([]);
      expect(prismaMock.food.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          name: { contains: 'unknown-food', mode: 'insensitive' },
        },
        take: 20,
        orderBy: [{ source: 'asc' }, { name: 'asc' }],
      });
    });

    it('returns mapped foods with numeric calories and macros', async () => {
      prismaMock.food.findMany.mockResolvedValue([
        {
          id: 'food-1',
          name: 'Nasi Putih',
          servingSize: '100g',
          servingUnit: 'g',
          servingWeightG: 100,
          calories: '130.00',
          protein: '2.70',
          carbs: '28.20',
          fat: '0.30',
          source: FoodSource.verified,
          barcode: null,
          externalId: 'staple-white-rice',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]);

      const results = await service.search('nasi');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Nasi Putih');
      expect(results[0].calories).toBe(130);
      expect(results[0].protein).toBe(2.7);
      expect(typeof results[0].calories).toBe('number');
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when food does not exist', async () => {
      prismaMock.food.findFirst.mockResolvedValue(null);
      await expect(service.getById('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('returns the mapped food', async () => {
      prismaMock.food.findFirst.mockResolvedValue({
        id: 'food-1',
        name: 'Dada Ayam',
        servingSize: '100g',
        servingUnit: 'g',
        servingWeightG: 100,
        calories: '165.00',
        protein: '31.00',
        carbs: '0.00',
        fat: '3.60',
        source: FoodSource.verified,
        barcode: null,
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const result = await service.getById('food-1');
      expect(result.id).toBe('food-1');
      expect(result.calories).toBe(165);
      expect(result.protein).toBe(31);
    });
  });

  describe('create', () => {
    it('creates a custom food with provided macros', async () => {
      prismaMock.food.create.mockImplementation((args: any) => ({
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }));

      const food = await service.create({
        name: 'Homemade Protein Bar',
        servingSize: '1 bar (60g)',
        servingUnit: 'bar',
        servingWeightG: 60,
        calories: 220,
        protein: 20,
        carbs: 22,
        fat: 6,
        source: 'custom',
      });

      expect(food.name).toBe('Homemade Protein Bar');
      expect(food.calories).toBe(220);
      expect(food.source).toBe('custom');
      expect(prismaMock.food.create).toHaveBeenCalled();
    });
  });
});
