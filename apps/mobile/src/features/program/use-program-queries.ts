/**
 * Server-data hooks for Programs & rule-selected templates (TanStack Query).
 */
import type { Program, Workout } from '@liftmate/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export interface StarterTemplateSummary {
  id: string;
  name: string;
  goal: string;
  frequency: number;
  duration: string;
  description: string;
  requiredEquipment: string[];
}

/** Fetch user's current active program (auto-assigned if onboarded). */
export function useCurrentProgram() {
  return useQuery<Program | null>({
    queryKey: ['program', 'current'],
    queryFn: async () => {
      try {
        const res = await api.get('/programs/current');
        return (res.data as Program) || null;
      } catch (err: any) {
        // Handle unauthenticated or network errors gracefully
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
  });
}

/** Fetch the available starter template library. */
export function useProgramTemplates() {
  return useQuery<StarterTemplateSummary[]>({
    queryKey: ['program', 'templates'],
    queryFn: async () => {
      const res = await api.get('/programs/templates');
      return res.data as StarterTemplateSummary[];
    },
  });
}

/** Start a scheduled day from a program, creating or resuming an active workout. */
export function useStartProgramDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      programId,
      day,
    }: {
      programId: string;
      day: number;
    }): Promise<Workout> => {
      const res = await api.post(`/programs/${programId}/start-day/${day}`);
      return res.data as Workout;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] });
      void queryClient.invalidateQueries({ queryKey: ['program', 'current'] });
    },
  });
}

/** Activate a program. */
export function useActivateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (programId: string): Promise<Program> => {
      const res = await api.post(`/programs/${programId}/activate`);
      return res.data as Program;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['program', 'current'] });
    },
  });
}
