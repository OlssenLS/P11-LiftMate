import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateFoodInput,
  CreateFoodLogInput,
  DailyNutritionSummary,
  Food,
  FoodLog,
  UpdateFoodLogInput,
  RecognizeFoodInput,
  RecognizeFoodResponse,
  ConfirmFoodRecognitionInput,
} from '@liftmate/shared';

import { mapDbFoodToShared, supabase } from '@/lib/supabase';
import { api } from '@/lib/api-client';
import { enqueueOp } from '@/lib/db';
import { getIsOffline } from '@/lib/network';
import { newId } from '@/lib/uuid';

/**
 * Fetch daily nutrition summary including totals, targets, progress %, and grouped meal items.
 */
export function useDailyNutritionSummary(date: string) {
  return useQuery<DailyNutritionSummary>({
    queryKey: ['nutrition', 'daily', date],
    queryFn: async () => {
      const res = await api.get(`/food-logs?date=${date}`);
      return res.data as DailyNutritionSummary;
    },
  });
}

/**
 * Search the food catalog (verified staples and user custom entries).
 */
export function useFoodSearch(query: string, limit = 20) {
  return useQuery<Food[]>({
    queryKey: ['foods', 'search', query, limit],
    queryFn: async () => {
      const trimmed = query.trim();
      let dbQuery = supabase.from('foods').select('*');
      if (trimmed) {
        dbQuery = dbQuery.ilike('name', `%${trimmed}%`);
      }
      const { data, error } = await dbQuery
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(mapDbFoodToShared);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

/**
 * Log a food item with client UUID and offline queuing fallback.
 */
export function useCreateFoodLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFoodLogInput): Promise<FoodLog> => {
      const id = input.id ?? newId();
      const payload: CreateFoodLogInput = {
        ...input,
        id,
      };

      if (getIsOffline()) {
        await enqueueOp({
          id,
          method: 'POST',
          path: '/food-logs',
          body: payload,
          createdAt: Date.now(),
        });

        // Return optimistic food log entry
        return {
          id,
          userId: 'offline-user',
          foodId: payload.foodId ?? null,
          foodName: payload.foodName,
          servingSize: payload.servingSize,
          quantity: payload.quantity,
          mealType: payload.mealType,
          loggedAt: payload.loggedAt ? new Date(payload.loggedAt) : new Date(),
          calories: payload.calories,
          protein: payload.protein,
          carbs: payload.carbs,
          fat: payload.fat,
          source: payload.source ?? 'database',
          notes: payload.notes ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
      }

      try {
        const res = await api.post('/food-logs', payload);
        return res.data as FoodLog;
      } catch (err) {
        // Enqueue on failure for background sync replay
        await enqueueOp({
          id,
          method: 'POST',
          path: '/food-logs',
          body: payload,
          createdAt: Date.now(),
        });
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'daily'] });
    },
  });
}

/**
 * Update a logged food entry.
 */
export function useUpdateFoodLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFoodLogInput;
    }): Promise<FoodLog> => {
      const res = await api.patch(`/food-logs/${id}`, data);
      return res.data as FoodLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'daily'] });
    },
  });
}

/**
 * Soft-delete a food log entry.
 */
export function useDeleteFoodLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const res = await api.delete(`/food-logs/${id}`);
      return res.data as { success: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'daily'] });
    },
  });
}

/**
 * Create a new custom food item in catalog.
 */
export function useCreateFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFoodInput): Promise<Food> => {
      const { data, error } = await supabase
        .from('foods')
        .insert({
          id: input.id,
          name: input.name.trim(),
          serving_size: input.servingSize.trim(),
          serving_unit: input.servingUnit,
          serving_weight_g: input.servingWeightG ?? null,
          calories: input.calories,
          protein: input.protein,
          carbs: input.carbs,
          fat: input.fat,
          source: input.source ?? 'custom',
          barcode: input.barcode ?? null,
          external_id: input.externalId ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapDbFoodToShared(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods', 'search'] });
    },
  });
}

/**
 * AI Food Recognition: Upload photo for multi-food detection & portion estimation (§29–§32).
 */
export function useRecognizeFood() {
  return useMutation({
    mutationFn: async (input: RecognizeFoodInput): Promise<RecognizeFoodResponse> => {
      const res = await api.post('/ai/food/recognize', input);
      return res.data as RecognizeFoodResponse;
    },
  });
}

/**
 * Confirm recognized food items and log them in user journal.
 */
export function useConfirmFoodRecognition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConfirmFoodRecognitionInput): Promise<FoodLog[]> => {
      const res = await api.post('/ai/food/confirm', input);
      return res.data as FoodLog[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'daily'] });
    },
  });
}

