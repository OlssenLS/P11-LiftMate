import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, MealType, FoodSource } from '@prisma/client';
import { randomUUID } from 'node:crypto';

describe('Migration M-D Nutrition (Foods & FoodLogs) Integrity', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('supports MealType enum values in PostgreSQL', async () => {
    const enumRows = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'MealType'
      ORDER BY e.enumsortorder;
    `);

    const labels = enumRows.map((r: { enumlabel: string }) => r.enumlabel);
    expect(labels).toContain('breakfast');
    expect(labels).toContain('lunch');
    expect(labels).toContain('dinner');
    expect(labels).toContain('snack');
  });

  it('supports FoodSource enum values in PostgreSQL', async () => {
    const enumRows = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'FoodSource'
      ORDER BY e.enumsortorder;
    `);

    const labels = enumRows.map((r: { enumlabel: string }) => r.enumlabel);
    expect(labels).toContain('verified');
    expect(labels).toContain('custom');
    expect(labels).toContain('tkpi');
    expect(labels).toContain('open_food_facts');
  });

  it('can create, link, update, and soft-delete Food and FoodLog records', async () => {
    const user = await prisma.user.findFirst();
    expect(user).toBeDefined();
    if (!user) return;

    const testFoodId = randomUUID();
    const testFoodLogId = randomUUID();

    // 1. Create Food
    const food = await prisma.food.create({
      data: {
        id: testFoodId,
        name: 'M-D Test Tempe Orek',
        servingSize: '1 porsi (75g)',
        servingUnit: 'g',
        servingWeightG: 75,
        calories: 145,
        protein: 11.2,
        carbs: 9.4,
        fat: 7.8,
        source: FoodSource.tkpi,
        externalId: `test-tempe-${testFoodId}`,
      },
    });

    expect(food.id).toBe(testFoodId);
    expect(Number(food.calories)).toBe(145);
    expect(Number(food.protein)).toBe(11.2);

    // 2. Create FoodLog
    const foodLog = await prisma.foodLog.create({
      data: {
        id: testFoodLogId,
        userId: user.id,
        foodId: food.id,
        foodName: food.name,
        servingSize: food.servingSize,
        quantity: 1.5,
        mealType: MealType.lunch,
        loggedAt: new Date(),
        calories: 217.5,
        protein: 16.8,
        carbs: 14.1,
        fat: 11.7,
        source: 'database',
      },
    });

    expect(foodLog.id).toBe(testFoodLogId);
    expect(foodLog.mealType).toBe(MealType.lunch);
    expect(Number(foodLog.quantity)).toBe(1.5);
    expect(Number(foodLog.calories)).toBe(217.5);

    // 3. Update FoodLog
    const updated = await prisma.foodLog.update({
      where: { id: testFoodLogId },
      data: {
        quantity: 2.0,
        calories: 290,
      },
    });
    expect(Number(updated.quantity)).toBe(2.0);
    expect(Number(updated.calories)).toBe(290);

    // 4. Soft-delete FoodLog
    const softDeleted = await prisma.foodLog.update({
      where: { id: testFoodLogId },
      data: {
        deletedAt: new Date(),
      },
    });
    expect(softDeleted.deletedAt).not.toBeNull();

    // 5. Cleanup test records
    await prisma.foodLog.delete({ where: { id: testFoodLogId } });
    await prisma.food.delete({ where: { id: testFoodId } });
  });
});
