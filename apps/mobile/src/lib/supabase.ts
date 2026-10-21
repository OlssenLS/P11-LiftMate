import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  exerciseSchema,
  foodSchema,
  publicUserSchema,
  userPreferencesSchema,
  type Exercise,
  type Food,
  type PublicUser,
  type UpdateUserInput,
  type UpdateUserPreferencesInput,
  type UserPreferences,
} from '@liftmate/shared';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config/env';

const CHUNK_SIZE = 1800;

export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    try {
      const countStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        const chunks = await Promise.all(
          Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}__chunk_${i}`)),
        );
        if (chunks.some((c) => c === null)) return null;
        return chunks.join('');
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return;
    }
    try {
      // Clean up previous chunks if any
      const oldCountStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (oldCountStr) {
        const oldCount = parseInt(oldCountStr, 10);
        await Promise.all(
          Array.from({ length: oldCount }, (_, i) =>
            SecureStore.deleteItemAsync(`${key}__chunk_${i}`).catch(() => undefined),
          ),
        );
        await SecureStore.deleteItemAsync(`${key}__chunks`).catch(() => undefined);
      }

      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        return;
      }

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      await SecureStore.setItemAsync(`${key}__chunks`, String(chunks.length));
      await Promise.all(
        chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}__chunk_${i}`, chunk)),
      );
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
    } catch (e) {
      console.warn('[Supabase Storage] Failed to persist secure item:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return;
    }
    try {
      const countStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        await Promise.all(
          Array.from({ length: count }, (_, i) =>
            SecureStore.deleteItemAsync(`${key}__chunk_${i}`).catch(() => undefined),
          ),
        );
        await SecureStore.deleteItemAsync(`${key}__chunks`).catch(() => undefined);
      }
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
    } catch (e) {
      console.warn('[Supabase Storage] Failed to remove secure item:', e);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function mapDbUserToPublicUser(row: Record<string, any>): PublicUser {
  return publicUserSchema.parse({
    id: row.id,
    email: row.email,
    displayName: row.display_name || row.email?.split('@')[0] || 'User',
    dateOfBirth: row.date_of_birth ?? null,
    weightUnit: row.weight_unit ?? 'kg',
    timezone: row.timezone ?? 'UTC',
    gender: row.gender ?? null,
    heightCm: row.height_cm ?? null,
    weightKg: row.weight_kg ?? null,
    bodyFatPct: row.body_fat_pct ?? null,
    targetWeightKg: row.target_weight_kg ?? null,
    workoutDuration: row.workout_duration ?? null,
    trainingLocation: row.training_location ?? null,
    onboardedAt: row.onboarded_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapAuthUserToPublicUser(
  authUser: { id: string; email?: string | null; user_metadata?: Record<string, any>; created_at?: string; updated_at?: string },
  dbUser?: Record<string, any> | null,
): PublicUser {
  if (dbUser) {
    return mapDbUserToPublicUser(dbUser);
  }
  return publicUserSchema.parse({
    id: authUser.id,
    email: authUser.email ?? '',
    displayName:
      authUser.user_metadata?.displayName ||
      authUser.user_metadata?.display_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split('@')[0] ||
      'User',
    dateOfBirth: null,
    weightUnit: 'kg',
    timezone: 'UTC',
    gender: null,
    heightCm: null,
    weightKg: null,
    bodyFatPct: null,
    targetWeightKg: null,
    workoutDuration: null,
    trainingLocation: null,
    onboardedAt: null,
    createdAt: authUser.created_at || new Date().toISOString(),
    updatedAt: authUser.updated_at || new Date().toISOString(),
  });
}

export function mapDbPreferencesToUserPreferences(row: Record<string, any>): UserPreferences {
  return userPreferencesSchema.parse({
    id: row.id,
    userId: row.user_id,
    preferredEquipment: row.preferred_equipment ?? [],
    preferredExercises: row.preferred_exercises ?? [],
    avoidExercises: row.avoid_exercises ?? [],
    dietaryPreferences: row.dietary_preferences ?? [],
    weeklyFrequency: row.weekly_frequency ?? null,
    defaultRestSeconds: row.default_rest_seconds ?? 120,
    primaryGoal: row.primary_goal ?? null,
    secondaryGoal: row.secondary_goal ?? null,
    experienceLevel: row.experience_level ?? null,
    targetCalories: row.target_calories ?? null,
    targetProtein: row.target_protein ?? null,
    targetCarbs: row.target_carbs ?? null,
    targetFat: row.target_fat ?? null,
    notificationsWorkoutReminder: row.notifications_workout_reminder ?? true,
    notificationsNutritionReminder: row.notifications_nutrition_reminder ?? true,
    notificationsProgressReminder: row.notifications_progress_reminder ?? true,
    notificationsAiInsight: row.notifications_ai_insight ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  });
}

export function mapUserPreferencesToDb(input: UpdateUserPreferencesInput): Record<string, any> {
  const mapped: Record<string, any> = {};
  if (input.preferredEquipment !== undefined) mapped.preferred_equipment = input.preferredEquipment;
  if (input.preferredExercises !== undefined) mapped.preferred_exercises = input.preferredExercises;
  if (input.avoidExercises !== undefined) mapped.avoid_exercises = input.avoidExercises;
  if (input.dietaryPreferences !== undefined) mapped.dietary_preferences = input.dietaryPreferences;
  if (input.weeklyFrequency !== undefined) mapped.weekly_frequency = input.weeklyFrequency;
  if (input.defaultRestSeconds !== undefined) mapped.default_rest_seconds = input.defaultRestSeconds;
  if (input.primaryGoal !== undefined) mapped.primary_goal = input.primaryGoal;
  if (input.secondaryGoal !== undefined) mapped.secondary_goal = input.secondaryGoal;
  if (input.experienceLevel !== undefined) mapped.experience_level = input.experienceLevel;
  if (input.targetCalories !== undefined) mapped.target_calories = input.targetCalories;
  if (input.targetProtein !== undefined) mapped.target_protein = input.targetProtein;
  if (input.targetCarbs !== undefined) mapped.target_carbs = input.targetCarbs;
  if (input.targetFat !== undefined) mapped.target_fat = input.targetFat;
  if (input.notificationsWorkoutReminder !== undefined) {
    mapped.notifications_workout_reminder = input.notificationsWorkoutReminder;
  }
  if (input.notificationsNutritionReminder !== undefined) {
    mapped.notifications_nutrition_reminder = input.notificationsNutritionReminder;
  }
  if (input.notificationsProgressReminder !== undefined) {
    mapped.notifications_progress_reminder = input.notificationsProgressReminder;
  }
  if (input.notificationsAiInsight !== undefined) {
    mapped.notifications_ai_insight = input.notificationsAiInsight;
  }
  mapped.updated_at = new Date().toISOString();
  return mapped;
}

export function mapUpdateUserToDb(input: UpdateUserInput): Record<string, any> {
  const mapped: Record<string, any> = {};
  if (input.displayName !== undefined) mapped.display_name = input.displayName;
  if (input.dateOfBirth !== undefined) mapped.date_of_birth = input.dateOfBirth;
  if (input.weightUnit !== undefined) mapped.weight_unit = input.weightUnit;
  if (input.timezone !== undefined) mapped.timezone = input.timezone;
  if (input.gender !== undefined) mapped.gender = input.gender;
  if (input.heightCm !== undefined) mapped.height_cm = input.heightCm;
  if (input.weightKg !== undefined) mapped.weight_kg = input.weightKg;
  if (input.bodyFatPct !== undefined) mapped.body_fat_pct = input.bodyFatPct;
  if (input.targetWeightKg !== undefined) mapped.target_weight_kg = input.targetWeightKg;
  if (input.workoutDuration !== undefined) mapped.workout_duration = input.workoutDuration;
  if (input.trainingLocation !== undefined) mapped.training_location = input.trainingLocation;
  mapped.updated_at = new Date().toISOString();
  return mapped;
}

export function mapDbExerciseToShared(row: Record<string, any>): Exercise {
  return exerciseSchema.parse({
    id: row.id,
    name: row.name,
    primaryMuscle: row.primary_muscle,
    secondaryMuscles: row.secondary_muscles ?? [],
    equipment: row.equipment,
    movementPattern: row.movement_pattern,
    difficulty: row.difficulty,
    instructions: row.instructions ?? null,
    externalId: row.external_id ?? null,
    alternativeExercises: row.alternative_exercises ?? [],
  });
}

export function mapDbFoodToShared(row: Record<string, any>): Food {
  return foodSchema.parse({
    id: row.id,
    name: row.name,
    servingSize: row.serving_size,
    servingUnit: row.serving_unit ?? 'g',
    servingWeightG: row.serving_weight_g ?? null,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    source: row.source,
    barcode: row.barcode ?? null,
    externalId: row.external_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  });
}


