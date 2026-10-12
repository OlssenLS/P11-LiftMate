import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AnalyticsOverviewResponse,
  GenerateAnalyticsInput,
} from '@liftmate/shared';
import { api } from '@/lib/api-client';

/**
 * Fetch analytics overview, metrics calculation, and structured insights (Spec §50–§57).
 */
export function useAnalyticsOverview() {
  return useQuery<AnalyticsOverviewResponse>({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const res = await api.get('/ai/analytics/overview');
      return res.data as AnalyticsOverviewResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Trigger fresh generation of analytics insights.
 */
export function useGenerateAnalytics() {
  const queryClient = useQueryClient();

  return useMutation<AnalyticsOverviewResponse, Error, GenerateAnalyticsInput | undefined>({
    mutationFn: async (input) => {
      const res = await api.post('/ai/analytics/generate', input ?? { forceRefresh: true });
      return res.data as AnalyticsOverviewResponse;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['analytics', 'overview'], data);
    },
  });
}
