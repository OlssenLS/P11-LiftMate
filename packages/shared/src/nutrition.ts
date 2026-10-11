import { z } from "zod";
import { FoodSource, MealType } from "./enums.js";
import { uuid } from "./workout.js";

/**
 * Food item (master / verified database item or custom entry).
 */
export const foodSchema = z.object({
  id: uuid,
  name: z.string(),
  servingSize: z.string(),
  servingUnit: z.string().default("g"),
  servingWeightG: z.number().nullable().optional(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  source: FoodSource,
  barcode: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type Food = z.infer<typeof foodSchema>;

export const createFoodSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(255),
  servingSize: z.string().trim().min(1).max(100),
  servingUnit: z.string().trim().max(50).default("g"),
  servingWeightG: z.number().min(0).nullable().optional(),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
  fat: z.number().min(0).max(1000),
  source: FoodSource.default("custom"),
  barcode: z.string().trim().nullable().optional(),
  externalId: z.string().trim().nullable().optional(),
});
export type CreateFoodInput = z.infer<typeof createFoodSchema>;

/**
 * Individual logged food entry.
 */
export const foodLogSchema = z.object({
  id: uuid,
  userId: uuid,
  foodId: uuid.nullable().optional(),
  foodName: z.string(),
  servingSize: z.string(),
  quantity: z.number(),
  mealType: MealType,
  loggedAt: z.coerce.date(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  source: z.string(),
  notes: z.string().nullable().optional(),
  food: foodSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type FoodLog = z.infer<typeof foodLogSchema>;

export const createFoodLogSchema = z.object({
  id: uuid.optional(),
  foodId: uuid.nullable().optional(),
  foodName: z.string().trim().min(1).max(255),
  servingSize: z.string().trim().min(1).max(100),
  quantity: z.number().positive().max(100).default(1.0),
  mealType: MealType,
  loggedAt: z.coerce.date().default(() => new Date()),
  calories: z.number().min(0).max(20000),
  protein: z.number().min(0).max(2000),
  carbs: z.number().min(0).max(2000),
  fat: z.number().min(0).max(2000),
  source: z.string().default("database"),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export type CreateFoodLogInput = z.infer<typeof createFoodLogSchema>;

export const updateFoodLogSchema = z.object({
  foodName: z.string().trim().min(1).max(255).optional(),
  servingSize: z.string().trim().min(1).max(100).optional(),
  quantity: z.number().positive().max(100).optional(),
  mealType: MealType.optional(),
  loggedAt: z.coerce.date().optional(),
  calories: z.number().min(0).max(20000).optional(),
  protein: z.number().min(0).max(2000).optional(),
  carbs: z.number().min(0).max(2000).optional(),
  fat: z.number().min(0).max(2000).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export type UpdateFoodLogInput = z.infer<typeof updateFoodLogSchema>;

/**
 * Daily macro totals and summary.
 */
export const macroNutrientsSchema = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
});
export type MacroNutrients = z.infer<typeof macroNutrientsSchema>;

export const mealGroupSchema = z.object({
  mealType: MealType,
  name: z.string(),
  totals: macroNutrientsSchema,
  items: z.array(foodLogSchema),
});
export type MealGroup = z.infer<typeof mealGroupSchema>;

export const dailyNutritionSummarySchema = z.object({
  date: z.string(), // YYYY-MM-DD
  totals: macroNutrientsSchema,
  targets: macroNutrientsSchema,
  remaining: macroNutrientsSchema,
  progressPct: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0),
  }),
  meals: z.array(mealGroupSchema),
});
export type DailyNutritionSummary = z.infer<typeof dailyNutritionSummarySchema>;
