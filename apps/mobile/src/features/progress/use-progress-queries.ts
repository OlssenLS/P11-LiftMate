import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BodyWeightLog,
  ConsistencyProgressSummary,
  CreateBodyWeightLogInput,
  ExerciseStrengthProgress,
  ProgressOverview,
  VolumeProgressSummary,
  WeightProgressSummary,
} from '@liftmate/shared';

import { api } from '@/lib/api-client';
import { enqueueOp } from '@/lib/db';
import { getIsOffline } from '@/lib/network';
import { newId } from '@/lib/uuid';

/**
 * Fetch aggregated progress summary for the Home screen dashboard.
 */
export function useProgressSummary() {
  return useQuery<ProgressOverview>({
    queryKey: ['progress', 'summary'],
    queryFn: async () => {
      const res = await api.get('/progress/summary');
      return res.data as ProgressOverview;
    },
  });
}

/**
 * Fetch body weight progress history, start/target weight, and monthly delta.
 */
export function useWeightProgress() {
  return useQuery<WeightProgressSummary>({
    queryKey: ['progress', 'weight'],
    queryFn: async () => {
      const res = await api.get('/progress/weight');
      return res.data as WeightProgressSummary;
    },
  });
}

/**
 * Log a body weight measurement with client UUID and offline queuing fallback.
 */
export function useLogWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBodyWeightLogInput): Promise<BodyWeightLog> => {
      const id = input.id ?? newId();
      const payload: CreateBodyWeightLogInput = {
        ...input,
        id,
      };

      if (getIsOffline()) {
        await enqueueOp({
          id,
          method: 'POST',
          path: '/progress/weight',
          body: payload,
          createdAt: Date.now(),
        });

        return {
          id,
          userId: 'offline-user',
          weightKg: payload.weightKg,
          loggedAt: payload.loggedAt ? new Date(payload.loggedAt) : new Date(),
          notes: payload.notes ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
      }

      try {
        const res = await api.post('/progress/weight', payload);
        return res.data as BodyWeightLog;
      } catch (err) {
        await enqueueOp({
          id,
          method: 'POST',
          path: '/progress/weight',
          body: payload,
          createdAt: Date.now(),
        });
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
}

/**
 * Fetch volume progression and muscle group distribution.
 */
export function useVolumeProgress(range: 'week' | 'month' = 'week') {
  return useQuery<VolumeProgressSummary>({
    queryKey: ['progress', 'volume', range],
    queryFn: async () => {
      const res = await api.get(`/progress/volume?range=${range}`);
      return res.data as VolumeProgressSummary;
    },
  });
}

/**
 * Fetch workout consistency against planned weekly schedule.
 */
export function useConsistencyProgress() {
  return useQuery<ConsistencyProgressSummary>({
    queryKey: ['progress', 'consistency'],
    queryFn: async () => {
      const res = await api.get('/progress/consistency');
      return res.data as ConsistencyProgressSummary;
    },
  });
}

/**
 * Fetch per-exercise strength progression and estimated 1RM history.
 */
export function useStrengthProgress(exerciseId: string) {
  return useQuery<ExerciseStrengthProgress>({
    queryKey: ['progress', 'strength', exerciseId],
    queryFn: async () => {
      const res = await api.get(`/progress/strength/${exerciseId}`);
      return res.data as ExerciseStrengthProgress;
    },
    enabled: Boolean(exerciseId),
  });
}
