import type { FitnessGoal, Gender } from "./enums.js";

export interface NutritionCalcInput {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  age: number;
  weeklyFrequency: number;
  primaryGoal: FitnessGoal;
}

export interface NutritionTargetsResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  isEstimate: boolean;
}

export const DIETARY_PREFERENCES = [
  "none",
  "vegetarian",
  "vegan",
  "halal",
  "pescatarian",
  "gluten_free",
  "dairy_free",
] as const;

export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];

/**
 * Calculates daily calorie and macronutrient targets using the Mifflin-St Jeor formula.
 *
 * Mifflin-St Jeor:
 * - Male: 10 * w + 6.25 * h - 5 * age + 5
 * - Female: 10 * w + 6.25 * h - 5 * age - 161
 * - Other / Prefer not to say: midpoint constant -78 ((5 + (-161)) / 2).
 *   Labeled as an estimate per customer spec amendments.
 *
 * Activity Multiplier (based on training frequency 2-6 days/week):
 * - <= 2 days: 1.375 (lightly active)
 * - 3-4 days: 1.55 (moderately active)
 * - 5-6 days: 1.725 (very active)
 *
 * Goal Adjustments:
 * - lose_fat: -500 kcal
 * - build_muscle: +300 kcal
 * - gain_strength: +200 kcal
 * - body_recomposition: -100 kcal
 * - general_fitness: 0 kcal
 *
 * Macronutrient Split:
 * - Protein: 2.0 g / kg bodyweight (4 kcal/g)
 * - Fat: 0.9 g / kg bodyweight (9 kcal/g)
 * - Carbs: Remaining calories / 4 kcal/g (minimum 50 g)
 */
export function calculateNutritionTargets(
  input: NutritionCalcInput
): NutritionTargetsResult {
  const { gender, weightKg, heightCm, age, weeklyFrequency, primaryGoal } =
    input;

  let genderConstant = -78;
  let isEstimate = true;

  if (gender === "male") {
    genderConstant = 5;
    isEstimate = false;
  } else if (gender === "female") {
    genderConstant = -161;
    isEstimate = false;
  }

  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + genderConstant;

  let activityMultiplier = 1.375;
  if (weeklyFrequency >= 5) {
    activityMultiplier = 1.725;
  } else if (weeklyFrequency >= 3) {
    activityMultiplier = 1.55;
  }

  const tdee = Math.round(bmr * activityMultiplier);

  let goalAdjustment = 0;
  switch (primaryGoal) {
    case "lose_fat":
      goalAdjustment = -500;
      break;
    case "build_muscle":
      goalAdjustment = 300;
      break;
    case "gain_strength":
      goalAdjustment = 200;
      break;
    case "body_recomposition":
      goalAdjustment = -100;
      break;
    case "general_fitness":
    default:
      goalAdjustment = 0;
      break;
  }

  const targetCalories = Math.max(1200, Math.round(tdee + goalAdjustment));
  const targetProtein = Math.max(30, Math.round(weightKg * 2.0));
  const targetFat = Math.max(20, Math.round(weightKg * 0.9));

  const remainingCalories = targetCalories - (targetProtein * 4 + targetFat * 9);
  const targetCarbs = Math.max(50, Math.round(remainingCalories / 4));

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    isEstimate,
  };
}

/**
 * Derives user's age in full years from their birth date string or Date object.
 */
export function deriveAgeFromDateOfBirth(dob: Date | string): number {
  const birth = typeof dob === "string" ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}
