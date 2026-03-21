import { useRef } from 'react';
import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';

export const useConversation = (conversationId: string | null | undefined) => {
  const { conversation, isLoading, error, fetchConversation, refetch, clear } =
    useConversationStore();

  const prevIdRef = useRef<string | null | undefined>(undefined);
  if (prevIdRef.current !== conversationId) {
    prevIdRef.current = conversationId;
    if (conversationId) {
      void fetchConversation(conversationId);
    } else {
      clear();
    }
  }

  return { conversation, isLoading, error, refetch };
};
