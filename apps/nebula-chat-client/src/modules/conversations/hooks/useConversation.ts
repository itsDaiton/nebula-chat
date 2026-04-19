import { useEffect } from 'react';
import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';

export const useConversation = (conversationId: string | null | undefined) => {
  const { conversation, isLoading, error, fetchConversation, refetch, clear } =
    useConversationStore();

  // keeping this useEffect for now; we will replace API fetching with tanstack-query soon
  useEffect(() => {
    if (conversationId) {
      void fetchConversation(conversationId);
    } else {
      clear();
    }
  }, [conversationId, fetchConversation, clear]);

  return { conversation, isLoading, error, refetch };
};
