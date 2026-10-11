import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AiConversation,
  AiConversationDetail,
  CreateAiConversationInput,
  SendAiMessageInput,
  SuggestedQuestionsResponse,
} from '@liftmate/shared';

import { api } from '@/lib/api-client';

/**
 * Fetch all AI Coach conversations for the user.
 */
export function useCoachConversations() {
  return useQuery<AiConversation[]>({
    queryKey: ['coach', 'conversations'],
    queryFn: async () => {
      const res = await api.get('/ai/coach/conversations');
      return res.data as AiConversation[];
    },
  });
}

/**
 * Fetch or auto-create the active AI Coach conversation.
 */
export function useActiveCoachConversation() {
  return useQuery<AiConversationDetail>({
    queryKey: ['coach', 'active'],
    queryFn: async () => {
      const res = await api.get('/ai/coach/active');
      return res.data as AiConversationDetail;
    },
  });
}

/**
 * Fetch detail of a specific conversation by ID.
 */
export function useCoachConversation(conversationId?: string) {
  return useQuery<AiConversationDetail>({
    queryKey: ['coach', 'conversation', conversationId],
    queryFn: async () => {
      const res = await api.get(`/ai/coach/conversations/${conversationId}`);
      return res.data as AiConversationDetail;
    },
    enabled: Boolean(conversationId),
  });
}

/**
 * Fetch dynamic suggested questions tailored to the user's recent training and nutrition.
 */
export function useSuggestedQuestions() {
  return useQuery<SuggestedQuestionsResponse>({
    queryKey: ['coach', 'suggested-questions'],
    queryFn: async () => {
      const res = await api.get('/ai/coach/suggested-questions');
      return res.data as SuggestedQuestionsResponse;
    },
  });
}

/**
 * Send a message to an active conversation with optimistic or immediate cache update.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      metadata,
    }: {
      conversationId: string;
      content: string;
      metadata?: Record<string, any>;
    }) => {
      const payload: SendAiMessageInput = { content, metadata };
      const res = await api.post(
        `/ai/coach/conversations/${conversationId}/messages`,
        payload,
      );
      return res.data as {
        userMessage: any;
        assistantMessage: any;
      };
    },
    onSuccess: (data, variables) => {
      // Invalidate active and specific conversation
      queryClient.invalidateQueries({
        queryKey: ['coach', 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['coach', 'conversation', variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['coach', 'conversations'],
      });
    },
  });
}

/**
 * Create a new coaching conversation.
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAiConversationInput) => {
      const res = await api.post('/ai/coach/conversations', input);
      return res.data as AiConversationDetail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach'] });
    },
  });
}
