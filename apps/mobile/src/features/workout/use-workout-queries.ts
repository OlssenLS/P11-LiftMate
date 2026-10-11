/**
 * Server-data hooks for the workout tracker (TanStack Query).
 */
import type {
  Exercise,
  ExerciseSearch,
  Workout,
  WorkoutStatus,
  WorkoutSummary,
} from '@liftmate/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

/** Search the exercise DB. Params map 1:1 to the API query schema. */
export function useExerciseSearch(params: Partial<ExerciseSearch>) {
  return useQuery<Exercise[]>({
    queryKey: ['exercises', params],
    queryFn: async () => {
      const res = await api.get('/exercises', { params });
      return res.data as Exercise[];
    },
  });
}

/** Fetch the computed summary for a workout (volume, sets, change vs previous, per-exercise deltas). */
export function useWorkoutSummary(workoutId: string | null) {
  return useQuery<WorkoutSummary>({
    queryKey: ['workout-summary', workoutId],
    enabled: workoutId != null,
    queryFn: async () => {
      const res = await api.get(`/workouts/${workoutId}/summary`);
      return res.data as WorkoutSummary;
    },
  });
}

/** Fetch the previous completed session for an exercise (for ghost values and previous comparisons). */
export function usePreviousSession(exerciseId: string | null, excludeWorkoutId?: string) {
  return useQuery<Workout | null>({
    queryKey: ['previous-session', exerciseId, excludeWorkoutId],
    enabled: exerciseId != null,
    queryFn: async () => {
      const res = await api.get('/workouts/previous', {
        params: { exerciseId, exclude: excludeWorkoutId },
      });
      return res.data as Workout | null;
    },
  });
}

/** Fetch recent completed sessions for an exercise (for the Exercise History sheet). */
export function useExerciseHistory(exerciseId: string | null, limit = 5, excludeWorkoutId?: string) {
  return useQuery<Workout[]>({
    queryKey: ['exercise-history', exerciseId, limit, excludeWorkoutId],
    enabled: exerciseId != null,
    queryFn: async () => {
      const res = await api.get('/workouts/exercise-history', {
        params: { exerciseId, limit, exclude: excludeWorkoutId },
      });
      return res.data as Workout[];
    },
  });
}

/** Fetch workout history list (by default, completed workouts). */
export function useWorkoutHistory(status: WorkoutStatus = 'completed', limit = 50) {
  return useQuery<Workout[]>({
    queryKey: ['workouts', { status, limit }],
    queryFn: async () => {
      const res = await api.get('/workouts', { params: { status, limit } });
      return res.data as Workout[];
    },
  });
}

/** Fetch a single workout by id (for history detail). */
export function useWorkoutDetail(workoutId: string | null) {
  return useQuery<Workout>({
    queryKey: ['workout', workoutId],
    enabled: workoutId != null,
    queryFn: async () => {
      const res = await api.get(`/workouts/${workoutId}`);
      return res.data as Workout;
    },
  });
}

/** Delete / discard a workout. */
export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (workoutId: string) => {
      await api.delete(`/workouts/${workoutId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

/** Update a workout's name or notes. */
export function useUpdateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string | null; notes?: string | null }) => {
      const res = await api.patch(`/workouts/${id}`, patch);
      return res.data as Workout;
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] });
      void queryClient.invalidateQueries({ queryKey: ['workout', updated.id] });
      void queryClient.invalidateQueries({ queryKey: ['workout-summary', updated.id] });
    },
  });
}

