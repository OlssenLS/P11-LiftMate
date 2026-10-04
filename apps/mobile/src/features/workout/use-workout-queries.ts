/**
 * Server-data hooks for the workout tracker (TanStack Query).
 */
import type { Exercise, ExerciseSearch, WorkoutSummary } from '@liftmate/shared';
import { useQuery } from '@tanstack/react-query';

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

/** Fetch the computed summary for a workout (volume, sets, change vs previous). */
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
