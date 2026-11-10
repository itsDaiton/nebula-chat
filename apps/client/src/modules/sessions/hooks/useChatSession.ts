import { useGetSession } from '@/libs/api/generated/sessions/sessions';
import { useListMessages } from '@/libs/api/generated/messages/messages';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useModelStore } from '@/modules/chat/stores/useModelStore';
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
  // Deferred: a store write during render warns about updating subscribers mid-render.
  const chat = useChatStreamStore.getState();
  if (!sessionId) {
    if (!chat.isStreaming && chat.sessionId !== undefined) {
      queueMicrotask(() =>
        useChatStreamStore.setState({ history: [], sessionId: undefined, isReplyStopped: false }),
      );
    }
  } else if (isSettled && chat.sessionId !== sessionId) {
    const history = messages.data;
    queueMicrotask(() => {
      useChatStreamStore.setState({ history, sessionId, isReplyStopped: false });
      // Only on opening a Session, so a later pick or refetch never resets the composer.
      const lastModel = history.findLast((message) => message.model)?.model;
      if (lastModel) {
        useModelStore.setState({ selectedModel: lastModel });
      }
    });
  }

  return {
    isLoading: hasSession && !isSettled && !detail.error && !messages.error,
    error: detail.error ?? messages.error,
    // An archived Session reads but takes no sends (the server refuses them).
    isArchived: detail.data?.archived === true,
    // Named once the history is in, so a re-attached reply lands after the saved Messages.
    activeStreamId: isSettled ? (detail.data?.activeStreamId ?? null) : null,
  };
};
