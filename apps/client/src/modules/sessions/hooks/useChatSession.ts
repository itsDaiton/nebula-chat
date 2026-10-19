import { useGetSession } from '@/libs/api/generated/sessions/sessions';
import { useListMessages } from '@/libs/api/generated/messages/messages';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { mapSessionMessages } from '@/modules/chat/utils/mapSessionMessages';

// Loads the routed session into the chat. Its messages come from the message
// list narrowed to it, oldest first.
export const useChatSession = (sessionId: string | undefined) => {
  const hasSession = Boolean(sessionId);

  const detail = useGetSession(sessionId ?? '', {
    query: { enabled: hasSession },
  });
  const messages = useListMessages(
    { sessionId },
    { query: { enabled: hasSession, select: mapSessionMessages } },
  );

  // A refetch in flight means the cached messages are stale (a stream just ended).
  const isSettled = detail.isSuccess && messages.isSuccess && !messages.isFetching;

  // Guarded render-time sync (no effect): the chat history follows the route.
  const chat = useChatStreamStore.getState();
  if (!sessionId) {
    if (!chat.isStreaming && chat.sessionId !== undefined) {
      useChatStreamStore.setState({ history: [], sessionId: undefined });
    }
  } else if (isSettled && chat.sessionId !== sessionId) {
    useChatStreamStore.setState({ history: messages.data, sessionId });
  }

  return {
    isLoading: hasSession && !isSettled && !detail.error && !messages.error,
    error: detail.error ?? messages.error,
  };
};
