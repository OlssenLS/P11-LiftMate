import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ConfirmProgramPlanInput,
  GenerateProgramInput,
  GeneratedProgramPlan,
  Program,
} from '@liftmate/shared';

import { api } from '@/lib/api-client';

/**
 * Hook to request an AI-generated training split from the backend.
 */
export function useGenerateProgramPlan() {
  return useMutation({
    mutationFn: async (
      input: GenerateProgramInput = {},
    ): Promise<GeneratedProgramPlan> => {
      const res = await api.post('/ai/planner/generate', input);
      return res.data as GeneratedProgramPlan;
    },
  });
}

/**
 * Hook to confirm, persist, and activate a generated program plan.
 */
export function useConfirmProgramPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ConfirmProgramPlanInput,
    ): Promise<Program> => {
      const res = await api.post('/ai/planner/confirm', input);
      return res.data as Program;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['program'] });
    },
  });
}
