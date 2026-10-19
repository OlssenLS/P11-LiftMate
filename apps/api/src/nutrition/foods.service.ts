import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Food, CreateFoodInput } from '@liftmate/shared';
import type { Food as PrismaFood } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export const FoodSource = {
  verified: 'verified',
  custom: 'custom',
  tkpi: 'tkpi',
  open_food_facts: 'open_food_facts',
} as const;
export type FoodSource = (typeof FoodSource)[keyof typeof FoodSource];

export function toFood(row: PrismaFood): Food {
  return {
    id: row.id,
    name: row.name,
    servingSize: row.servingSize,
    servingUnit: row.servingUnit,
    servingWeightG: row.servingWeightG,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    source: row.source,
    barcode: row.barcode,
    externalId: row.externalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

@Injectable()
export class FoodsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query?: string, limit = 20): Promise<Food[]> {
    const take = Math.min(Math.max(1, limit), 50);
    const trimmed = query?.trim();

    const rows = await this.prisma.food.findMany({
      where: {
        deletedAt: null,
        ...(trimmed
          ? {
              name: {
                contains: trimmed,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      take,
      orderBy: [
        { source: 'asc' }, // verified/tkpi first
        { name: 'asc' },
      ],
    });

    return rows.map(toFood);
  }

  async getById(id: string): Promise<Food> {
    const row = await this.prisma.food.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException(`Food with id ${id} not found`);
    }
    return toFood(row);
  }

  async create(input: CreateFoodInput): Promise<Food> {
    const row = await this.prisma.food.create({
      data: {
        id: input.id ?? randomUUID(),
        name: input.name,
        servingSize: input.servingSize,
        servingUnit: input.servingUnit ?? 'g',
        servingWeightG: input.servingWeightG ?? null,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        source: ((input.source as FoodSource) ?? FoodSource.custom) as any,
        barcode: input.barcode ?? null,
        externalId: input.externalId ?? null,
      },
    });
    return toFood(row);
  }
}
