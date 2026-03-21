import { useRef } from 'react';
import { mapConversationMessages } from '@/modules/chat/utils/chatUtils';
import type { UseConversationSyncParams } from '@/modules/chat/types/types';

export const useConversationSync = ({
  conversationId,
  conversation,
  isLoadingConversation,
  isStreaming,
  setHistory,
  setConversationId,
}: UseConversationSyncParams) => {
  const loadedConversationId = useRef<string | null>(null);
  const clearedForConversationId = useRef<string | undefined>(undefined);

  if (
    conversation?.messages &&
    conversation.id === conversationId &&
    conversation.id !== loadedConversationId.current
  ) {
    loadedConversationId.current = conversation.id;
    clearedForConversationId.current = conversation.id;
    setHistory(mapConversationMessages(conversation.messages));
    setConversationId(conversation.id);
  } else if (
    conversationId &&
    conversationId !== loadedConversationId.current &&
    conversationId !== clearedForConversationId.current
  ) {
    clearedForConversationId.current = conversationId;
    setHistory([]);
  } else if (!conversationId && !isStreaming && loadedConversationId.current !== null) {
    loadedConversationId.current = null;
    clearedForConversationId.current = undefined;
    setHistory([]);
    setConversationId(undefined);
  }

  return {
    isLoadingDifferentConversation:
      !!conversationId &&
      (isLoadingConversation || conversationId !== loadedConversationId.current),
  };
};
