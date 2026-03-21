import { useRef } from 'react';
import type { ConversationWithMessages } from '@/modules/conversations/types/types';
import type { ChatMessage } from '../types/types';
import { mapConversationMessages } from '../utils/chatUtils';

interface UseConversationSyncParams {
  conversationId: string | undefined;
  conversation: ConversationWithMessages | null;
  isLoadingConversation: boolean;
  isStreaming: boolean;
  setHistory: (messages: ChatMessage[]) => void;
  setConversationId: (id: string | undefined) => void;
}

export function useConversationSync({
  conversationId,
  conversation,
  isLoadingConversation,
  isStreaming,
  setHistory,
  setConversationId,
}: UseConversationSyncParams) {
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
    // Navigated to a different conversation — clear stale history while the new one loads.
    clearedForConversationId.current = conversationId;
    setHistory([]);
  } else if (!conversationId && !isStreaming && loadedConversationId.current !== null) {
    // Navigated back to the new-chat root — reset everything.
    loadedConversationId.current = null;
    clearedForConversationId.current = undefined;
    setHistory([]);
    setConversationId(undefined);
  }

  return {
    isLoadingDifferentConversation:
      !!conversationId && (isLoadingConversation || conversationId !== loadedConversationId.current),
  };
}
