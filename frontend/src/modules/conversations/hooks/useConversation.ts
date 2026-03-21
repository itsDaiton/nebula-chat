import { useEffect } from 'react';
import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';

export function useConversation(conversationId: string | null | undefined) {
  const { conversation, isLoading, error, fetchConversation, refetch, clear } =
    useConversationStore();

  useEffect(() => {
    if (!conversationId) {
      clear();
      return;
    }
    void fetchConversation(conversationId);
  }, [conversationId, fetchConversation, clear]);

  return { conversation, isLoading, error, refetch };
}
