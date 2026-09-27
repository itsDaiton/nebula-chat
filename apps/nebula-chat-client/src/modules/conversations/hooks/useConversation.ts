import { useGetConversation } from '@/libs/api/generated/conversations/conversations';
import { useListMessages } from '@/libs/api/generated/messages/messages';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { mapConversationMessages } from '@/modules/chat/utils/mapConversationMessages';

/**
 * The conversation named in the route, loaded into the chat.
 *
 * The API has no per-conversation messages endpoint, so its messages are read
 * from the caller's full message list — one cached query shared by every
 * conversation — and filtered here.
 */
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

  // A refetch in flight means the cached messages are stale (a stream just
  // ended), so the history waits for it rather than loading the old copy.
  const isSettled = detail.isSuccess && messages.isSuccess && !messages.isFetching;

  // Render-time sync, no effect: the chat store holds the history the view
  // shows, and it follows the route. Each write is guarded, so it happens once
  // per route change and a re-render is a no-op.
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
