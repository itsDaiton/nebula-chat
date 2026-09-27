import { useGetConversation } from '@/libs/api/generated/conversations/conversations';
import { useListMessages } from '@/libs/api/generated/messages/messages';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { mapConversationMessages } from '@/modules/chat/utils/mapConversationMessages';

// Loads the routed conversation into the chat. Its messages are filtered from the
// caller's full list, as no per-conversation messages endpoint exists.
export const useConversation = (conversationId: string | undefined) => {
  const hasConversation = Boolean(conversationId);

  const detail = useGetConversation(conversationId ?? '', {
    query: { enabled: hasConversation },
  });
  const messages = useListMessages({
    query: {
      enabled: hasConversation,
      select: (all) =>
        mapConversationMessages(all.filter((message) => message.conversationId === conversationId)),
    },
  });

  // A refetch in flight means the cached messages are stale (a stream just ended).
  const isSettled = detail.isSuccess && messages.isSuccess && !messages.isFetching;

  // Guarded render-time sync (no effect): the chat history follows the route.
  const chat = useChatStreamStore.getState();
  if (!conversationId) {
    if (!chat.isStreaming && chat.conversationId !== undefined) {
      useChatStreamStore.setState({ history: [], conversationId: undefined });
    }
  } else if (isSettled && chat.conversationId !== conversationId) {
    useChatStreamStore.setState({ history: messages.data, conversationId });
  }

  return {
    isLoading: hasConversation && !isSettled && !detail.error && !messages.error,
    error: detail.error ?? messages.error,
  };
};
