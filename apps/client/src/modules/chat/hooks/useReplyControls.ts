import { useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { cancelReplyStream } from '@/libs/api/generated/streams/streams';
import type { ChatMessage, ChatStreamState, ReplyEnd } from '@/modules/chat/types/types';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { failReply } from '@/modules/chat/streaming/replyHistory';
import { replyErrorMessage } from '@/modules/chat/streaming/sendErrors';
import { IDLE_REPLY } from '@/modules/chat/utils/replyState';

// Starts, stops and settles the newest reply; only the reply begun last can be aborted.
export const useReplyControls = () => {
  const navigate = useNavigate();
  const abortController = useRef<AbortController | null>(null);

  const begin = useCallback(() => {
    const controller = new AbortController();
    abortController.current = controller;
    return controller;
  }, []);

  // A finished reply lets go of its controller, unless a newer reply has taken over.
  const release = useCallback((controller: AbortController) => {
    if (abortController.current === controller) abortController.current = null;
  }, []);

  const abort = useCallback(() => {
    abortController.current?.abort();
    abortController.current = null;
    useChatStreamStore.setState({ reply: IDLE_REPLY });
  }, []);

  const requestCancel = useCallback(
    async (streamId: string) => {
      try {
        await cancelReplyStream(streamId);
      } catch {
        // The server never heard it, so no `end` is coming for it: stop reading instead.
        abort();
      }
    },
    [abort],
  );

  // The stop button: the worker ends the stream as `cancelled`, which finishes the reply as usual.
  const stop = useCallback(async () => {
    const { reply, streamId } = useChatStreamStore.getState();
    if (reply.status === 'sending') {
      // The send has not named the stream yet; it cancels once it does.
      useChatStreamStore.setState({ reply: { status: 'sending', stopRequested: true } });
      return;
    }
    if (reply.status === 'streaming' && streamId) await requestCancel(streamId);
  }, [requestCancel]);

  // A new chat's reply stays in flight until ChatContainer's `clearPostStream()` runs once the route has a
  // sessionId, so the navigation renders first; requestAnimationFrame could fire early and flash the empty state.
  const settle = useCallback(
    (end: ReplyEnd, newSessionId?: string) => {
      if (!newSessionId) {
        useChatStreamStore.setState({ reply: end });
        return;
      }
      useChatStreamStore.setState({ reply: { status: 'navigating', end } });
      void navigate({ to: '/s/$id', params: { id: newSessionId }, replace: true });
    },
    [navigate],
  );

  // The error replaces the reply; a new chat that got its Session moves to it, so the failure stays on screen.
  const settleFailure = useCallback(
    (err: unknown, newSessionId?: string) => {
      const error = replyErrorMessage(err);
      useChatStreamStore.getState().setHistory((prev) => failReply(prev, error));
      settle({ status: 'failed', error }, newSessionId);
    },
    [settle],
  );

  // Nothing was persisted, so the refused message goes back to the composer to resend.
  const returnToComposer = useCallback(
    (messages: ChatMessage[], extra: Partial<ChatStreamState> = {}) => {
      useChatStreamStore.setState({ history: messages.slice(0, -1), reply: IDLE_REPLY, ...extra });
      useMessageStore.getState().setMessage(messages.at(-1)?.content ?? '');
    },
    [],
  );

  // The new Session's route has rendered, so the reply rests at the end it reached.
  const clearPostStream = useCallback(() => {
    const { reply } = useChatStreamStore.getState();
    if (reply.status === 'navigating') useChatStreamStore.setState({ reply: reply.end });
  }, []);

  return {
    begin,
    release,
    abort,
    requestCancel,
    stop,
    settle,
    settleFailure,
    returnToComposer,
    clearPostStream,
  };
};
