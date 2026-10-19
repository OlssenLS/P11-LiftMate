import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  DailyNutritionSummary,
  FoodLog,
  CreateFoodLogInput,
  UpdateFoodLogInput,
  MealGroup,
} from '@liftmate/shared';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { toFood } from './foods.service.js';

export const MealType = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snack',
} as const;
export type MealType = (typeof MealType)[keyof typeof MealType];

type FoodLogRow = Prisma.FoodLogGetPayload<{ include: { food: true } }>;

export function toFoodLog(row: FoodLogRow): FoodLog {
  return {
    id: row.id,
    userId: row.userId,
    foodId: row.foodId,
    foodName: row.foodName,
    servingSize: row.servingSize,
    quantity: Number(row.quantity),
    mealType: row.mealType,
    loggedAt: row.loggedAt,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    source: row.source,
    notes: row.notes,
    food: row.food ? toFood(row.food) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

const DEFAULT_TARGETS = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};

const MEAL_ORDER: MealType[] = [
  MealType.breakfast,
  MealType.lunch,
  MealType.dinner,
  MealType.snack,
];

const MEAL_NAMES: Record<MealType, string> = {
  [MealType.breakfast]: 'Breakfast',
  [MealType.lunch]: 'Lunch',
  [MealType.dinner]: 'Dinner',
  [MealType.snack]: 'Snacks',
};

@Injectable()
export class FoodLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailySummary(userId: string, dateStr?: string): Promise<DailyNutritionSummary> {
    const formattedDate = dateStr
      ? dateStr.split('T')[0]
      : new Date().toISOString().split('T')[0];

    const startOfDay = new Date(`${formattedDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${formattedDate}T23:59:59.999Z`);

    const [userPrefs, rows] = await Promise.all([
      this.prisma.userPreferences.findUnique({
        where: { userId },
      }),
      this.prisma.foodLog.findMany({
        where: {
          userId,
          deletedAt: null,
          loggedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: { food: true },
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    const targets = {
      calories: userPrefs?.targetCalories ?? DEFAULT_TARGETS.calories,
      protein: userPrefs?.targetProtein ?? DEFAULT_TARGETS.protein,
      carbs: userPrefs?.targetCarbs ?? DEFAULT_TARGETS.carbs,
      fat: userPrefs?.targetFat ?? DEFAULT_TARGETS.fat,
    };

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    const mealsMap: Record<MealType, FoodLog[]> = {
      [MealType.breakfast]: [],
      [MealType.lunch]: [],
      [MealType.dinner]: [],
      [MealType.snack]: [],
    };

    for (const row of rows) {
      const item = toFoodLog(row);
      totalCalories += item.calories;
      totalProtein += item.protein;
      totalCarbs += item.carbs;
      totalFat += item.fat;

      if (mealsMap[row.mealType]) {
        mealsMap[row.mealType].push(item);
      }
    }

    const round1 = (val: number) => Math.round(val * 10) / 10;

    const totals = {
      calories: round1(totalCalories),
      protein: round1(totalProtein),
      carbs: round1(totalCarbs),
      fat: round1(totalFat),
    };

    const remaining = {
      calories: Math.max(0, round1(targets.calories - totals.calories)),
      protein: Math.max(0, round1(targets.protein - totals.protein)),
      carbs: Math.max(0, round1(targets.carbs - totals.carbs)),
      fat: Math.max(0, round1(targets.fat - totals.fat)),
    };

    const progressPct = {
      calories: targets.calories > 0 ? Math.round((totals.calories / targets.calories) * 100) : 0,
      protein: targets.protein > 0 ? Math.round((totals.protein / targets.protein) * 100) : 0,
      carbs: targets.carbs > 0 ? Math.round((totals.carbs / targets.carbs) * 100) : 0,
      fat: targets.fat > 0 ? Math.round((totals.fat / targets.fat) * 100) : 0,
    };

    const meals: MealGroup[] = MEAL_ORDER.map((mealType) => {
      const items = mealsMap[mealType];
      const mealCalories = items.reduce((sum, item) => sum + item.calories, 0);
      const mealProtein = items.reduce((sum, item) => sum + item.protein, 0);
      const mealCarbs = items.reduce((sum, item) => sum + item.carbs, 0);
      const mealFat = items.reduce((sum, item) => sum + item.fat, 0);

      return {
        mealType,
        name: MEAL_NAMES[mealType],
        totals: {
          calories: round1(mealCalories),
          protein: round1(mealProtein),
          carbs: round1(mealCarbs),
          fat: round1(mealFat),
        },
        items,
      };
    });

    return {
      date: formattedDate,
      totals,
      targets,
      remaining,
      progressPct,
      meals,
    };
  }

  async create(userId: string, input: CreateFoodLogInput): Promise<FoodLog> {
    const id = input.id ?? randomUUID();
    const loggedAt = input.loggedAt ? new Date(input.loggedAt) : new Date();

    const row = await this.prisma.foodLog.upsert({
      where: { id },
      update: {
        foodId: input.foodId ?? null,
        foodName: input.foodName,
        servingSize: input.servingSize,
        quantity: input.quantity,
        mealType: input.mealType as MealType,
        loggedAt,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        source: input.source ?? 'database',
        notes: input.notes ?? null,
        deletedAt: null,
      },
      create: {
        id,
        userId,
        foodId: input.foodId ?? null,
        foodName: input.foodName,
        servingSize: input.servingSize,
        quantity: input.quantity,
        mealType: input.mealType as MealType,
        loggedAt,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        source: input.source ?? 'database',
        notes: input.notes ?? null,
      },
      include: { food: true },
    });

    return toFoodLog(row);
  }

  async update(userId: string, id: string, input: UpdateFoodLogInput): Promise<FoodLog> {
    const existing = await this.prisma.foodLog.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Food log entry with id ${id} not found`);
    }

    const row = await this.prisma.foodLog.update({
      where: { id },
      data: {
        ...(input.foodName !== undefined ? { foodName: input.foodName } : {}),
        ...(input.servingSize !== undefined ? { servingSize: input.servingSize } : {}),
        ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
        ...(input.mealType !== undefined ? { mealType: input.mealType as MealType } : {}),
        ...(input.loggedAt !== undefined ? { loggedAt: new Date(input.loggedAt) } : {}),
        ...(input.calories !== undefined ? { calories: input.calories } : {}),
        ...(input.protein !== undefined ? { protein: input.protein } : {}),
        ...(input.carbs !== undefined ? { carbs: input.carbs } : {}),
        ...(input.fat !== undefined ? { fat: input.fat } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: { food: true },
    });

    return toFoodLog(row);
  }

  async delete(userId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.foodLog.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Food log entry with id ${id} not found`);
    }

    await this.prisma.foodLog.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
