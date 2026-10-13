import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AiConversation,
  AiConversationDetail,
  AiMessage,
  CreateAiConversationInput,
  SendAiMessageInput,
  SuggestedQuestionsResponse,
  AiCoachStatus,
} from '@liftmate/shared';

import { api } from '@/lib/api-client';

/**
 * Fetch AI Coach runtime status, API key detection, and quota diagnostics.
 */
export function useCoachStatus() {
  return useQuery<AiCoachStatus>({
    queryKey: ['coach', 'status'],
    queryFn: async () => {
      const res = await api.get('/ai/coach/status');
      return res.data as AiCoachStatus;
    },
    staleTime: 30 * 1000,
  });
}

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
 * Send a message to an active conversation with optimistic cache update.
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
        userMessage: AiMessage;
        assistantMessage: AiMessage;
      };
    },
    onMutate: async (variables) => {
      // 1. Cancel in-flight queries so optimistic update isn't overwritten
      await queryClient.cancelQueries({ queryKey: ['coach', 'active'] });
      await queryClient.cancelQueries({
        queryKey: ['coach', 'conversation', variables.conversationId],
      });

      // 2. Snapshot previous values for rollback
      const prevActive = queryClient.getQueryData<AiConversationDetail>(['coach', 'active']);
      const prevConversation = queryClient.getQueryData<AiConversationDetail>([
        'coach',
        'conversation',
        variables.conversationId,
      ]);

      // 3. Optimistic user message
      const optimisticUserMsg: AiMessage = {
        id: `optimistic-${Date.now()}`,
        conversationId: variables.conversationId,
        role: 'user',
        content: variables.content,
        metadata: variables.metadata ?? null,
        createdAt: new Date().toISOString(),
      };

      // 4. Optimistically update active conversation
      if (prevActive) {
        queryClient.setQueryData<AiConversationDetail>(['coach', 'active'], {
          ...prevActive,
          messages: [...prevActive.messages, optimisticUserMsg],
        });
      }

      // 5. Optimistically update specific conversation if cached
      if (prevConversation) {
        queryClient.setQueryData<AiConversationDetail>(
          ['coach', 'conversation', variables.conversationId],
          {
            ...prevConversation,
            messages: [...prevConversation.messages, optimisticUserMsg],
          },
        );
      }

      return { prevActive, prevConversation };
    },
    onError: (_err, variables, context) => {
      // Rollback to previous state on failure
      if (context?.prevActive) {
        queryClient.setQueryData(['coach', 'active'], context.prevActive);
      }
      if (context?.prevConversation) {
        queryClient.setQueryData(
          ['coach', 'conversation', variables.conversationId],
          context.prevConversation,
        );
      }
    },
    onSuccess: (data, variables) => {
      // Replace optimistic message and append assistant message directly
      queryClient.setQueryData<AiConversationDetail>(['coach', 'active'], (old) => {
        if (!old) return old;
        const filtered = old.messages.filter((m) => !m.id.startsWith('optimistic-'));
        return {
          ...old,
          messages: [...filtered, data.userMessage, data.assistantMessage],
        };
      });

      queryClient.setQueryData<AiConversationDetail>(
        ['coach', 'conversation', variables.conversationId],
        (old) => {
          if (!old) return old;
          const filtered = old.messages.filter((m) => !m.id.startsWith('optimistic-'));
          return {
            ...old,
            messages: [...filtered, data.userMessage, data.assistantMessage],
          };
        },
      );
    },
    onSettled: (_data, _error, variables) => {
      // Sync cache with server authority
      queryClient.invalidateQueries({
        queryKey: ['coach', 'active'],
      });
      if (variables?.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['coach', 'conversation', variables.conversationId],
        });
      }
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
