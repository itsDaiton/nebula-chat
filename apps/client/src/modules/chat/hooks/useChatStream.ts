import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCreateSession } from '@/libs/api/generated/sessions/sessions';
import { useSendMessage } from '@/libs/api/generated/chat/chat';
import { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import type { SendMessageBodyModel } from '@/libs/api/generated/model/sendMessageBodyModel';
import type {
  ChatHistoryStreamOptions,
  ResumeStreamOptions,
  UseChatStreamOptions,
} from '@/modules/chat/types/types';
import { useReplyControls } from '@/modules/chat/hooks/useReplyControls';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import { isReplyInFlight } from '@/modules/chat/utils/replyState';
import { followReply } from '@/modules/chat/streaming/followReply';
import { invalidateSessionList } from '@/modules/chat/streaming/invalidations';
import { startRun, withEmptyReply } from '@/modules/chat/streaming/replyHistory';
import { allowanceRefusalOf, sendFailureOf } from '@/modules/chat/streaming/sendErrors';
import { createChatSession, postMessage } from '@/modules/chat/streaming/sendReply';

// A failed send or stream renders inside the reply, so the global toaster stays out of it.
const INLINE_ERROR = { mutation: { meta: { inlineError: true } } };

// How long to wait before each reconnect of a dropped reply stream; once they run out, the reply fails.
const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 4_000, 8_000];

export const useChatStream = ({
  reconnectDelaysMs = RECONNECT_DELAYS_MS,
}: UseChatStreamOptions = {}) => {
  const { history, reply, usage, sessionId, setHistory, setUsage, setSessionId } =
    useChatStreamStore();
  const queryClient = useQueryClient();
  const { mutateAsync: createSession } = useCreateSession(INLINE_ERROR);
  const { mutateAsync: sendMessage } = useSendMessage(INLINE_ERROR);
  const {
    begin,
    release,
    abort,
    requestCancel,
    stop,
    settle,
    settleFailure,
    returnToComposer,
    clearPostStream,
  } = useReplyControls();

  // Held in a ref so `streamMessage` needn't depend on sessionId: a mid-send `setSessionId` would re-render all of ChatContainer.
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  // Follows the reply and settles it; aborted, `abort` already has.
  const follow = useCallback(
    async (streamId: string, followedSessionId: string, signal: AbortSignal, isNew = false) => {
      const end = await followReply(queryClient, {
        streamId,
        sessionId: followedSessionId,
        signal,
        reconnectDelaysMs,
        sink: {
          getHistory: () => useChatStreamStore.getState().history,
          setHistory,
          setUsage,
          isCurrent: (id) => sessionIdRef.current === id,
        },
      });
      if (end) settle(end, isNew ? followedSessionId : undefined);
    },
    [queryClient, reconnectDelaysMs, setHistory, setUsage, settle],
  );

  // A new chat gets its Session first; the send names the reply's stream, then the reply is followed.
  const streamMessage = useCallback(
    async ({
      model,
      mode = SendMessageBodyMode.direct,
      messages,
      sessionId: customSessionId,
    }: ChatHistoryStreamOptions) => {
      const controller = begin();
      const content = messages.at(-1)?.content ?? '';
      let activeSessionId = customSessionId ?? sessionIdRef.current;
      const isNewSession = !activeSessionId;
      useChatStreamStore.setState({
        reply: { status: 'sending', stopRequested: false },
        usage: null,
        streamId: null,
        isMessageAllowanceReached: false,
        isSpendAllowanceReached: false,
        history: withEmptyReply(messages),
      });

      try {
        if (!activeSessionId) {
          activeSessionId = await createChatSession(queryClient, createSession, content, mode);
          setSessionId(activeSessionId);
          // The sidebar can show it now, before its first reply.
          invalidateSessionList(queryClient);
        }
        const { streamId, runId } = await postMessage(queryClient, sendMessage, {
          sessionId: activeSessionId,
          content,
          mode,
          model: model as SendMessageBodyModel,
        });
        if (controller.signal.aborted) return;
        const sent = useChatStreamStore.getState().reply;
        useChatStreamStore.setState({ streamId, reply: { status: 'streaming' } });
        if (runId) {
          setHistory((prev) => startRun(prev, runId));
          useInspectorStore.getState().showRun(runId);
        }
        // Stop was pressed before the send named the stream.
        if (sent.status === 'sending' && sent.stopRequested) void requestCancel(streamId);
        await follow(streamId, activeSessionId, controller.signal, isNewSession);
      } catch (err) {
        const failure = sendFailureOf(err, mode);
        const refusal = allowanceRefusalOf(failure);
        if (refusal) {
          returnToComposer(messages, refusal.state);
          // The figure shown may be stale (another tab, or a Run's cost landing), so resync it.
          refusal.invalidate(queryClient);
          return;
        }
        // Aborted: `abort` has already settled the reply, and a newer one may be in flight.
        if (controller.signal.aborted) return;
        if (failure === 'run-forbidden') {
          returnToComposer(messages);
          toast.error((err as Error).message);
          return;
        }
        // A new chat that got its Session moves to it, so the failed reply stays on screen.
        settleFailure(err, isNewSession ? activeSessionId : undefined);
      } finally {
        release(controller);
      }
    },
    [
      begin,
      createSession,
      follow,
      queryClient,
      release,
      requestCancel,
      sendMessage,
      setHistory,
      setSessionId,
      settleFailure,
      returnToComposer,
    ],
  );

  // Re-attaches to a reply still in flight, say after a page reload: the stream replays from its
  // start into a fresh assistant Message after the saved ones, so nothing is missing or doubled.
  const resumeStream = useCallback(
    async ({ sessionId: resumedSessionId, streamId }: ResumeStreamOptions) => {
      const chat = useChatStreamStore.getState();
      // Already following it, or this tab just did and the Session read is not yet refreshed.
      if (isReplyInFlight(chat.reply) || chat.streamId === streamId) return;
      const controller = begin();
      useChatStreamStore.setState({
        reply: { status: 'streaming' },
        usage: null,
        sessionId: resumedSessionId,
        streamId,
        // A reload just after the worker persisted the reply already lists it; the replay replaces it.
        history: withEmptyReply(chat.history.filter((m) => m.id !== streamId)),
      });
      try {
        await follow(streamId, resumedSessionId, controller.signal);
      } catch (err) {
        if (!controller.signal.aborted) settleFailure(err);
      } finally {
        release(controller);
      }
    },
    [begin, follow, release, settleFailure],
  );

  return {
    history,
    isStreaming: isReplyInFlight(reply),
    isPostStreamNavigation: reply.status === 'navigating',
    isReplyStopped: reply.status === 'stopped',
    usage,
    streamMessage,
    resumeStream,
    stop,
    abort,
    clearPostStream,
    setSessionId,
    setHistory,
    sessionId,
  };
};
