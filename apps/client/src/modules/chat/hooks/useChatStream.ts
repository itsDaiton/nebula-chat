import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppError, isAppError } from '@nebula-chat/errors';
import { useCreateSession } from '@/libs/api/generated/sessions/sessions';
import { getGetMessageAllowanceQueryOptions, useSendMessage } from '@/libs/api/generated/chat/chat';
import { cancelReplyStream } from '@/libs/api/generated/streams/streams';
import { ErrorCode } from '@/libs/api/generated/model/errorCode';
import { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import type { SendMessageBodyModel } from '@/libs/api/generated/model/sendMessageBodyModel';
import { wakeWorker } from '@/shared/utils/wakeWorker';
import type {
  ChatHistoryStreamOptions,
  ChatMessage,
  ReplyEnd,
  ResumeStreamOptions,
  SseFrame,
  UseChatStreamOptions,
} from '@/modules/chat/types/types';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import { IDLE_REPLY, isReplyInFlight } from '@/modules/chat/utils/replyState';
import { applyStreamEvent, failReply } from '@/modules/chat/streaming/applyStreamEvent';
import { followStream } from '@/modules/chat/streaming/followStream';
import {
  invalidateAfterSend,
  invalidateCompletedStream,
  invalidateMessageAllowance,
  invalidateRun,
  invalidateSessionList,
} from '@/modules/chat/streaming/invalidations';
import { EMPTY_RUN } from '@/modules/chat/streaming/runProgress';
import { showSavedReply, showSavedReplyMeta } from '@/modules/chat/streaming/savedReply';
import { resources } from '@/resources';

// A failed send or stream renders inside the reply, so the global toaster stays out of it.
const INLINE_ERROR = { mutation: { meta: { inlineError: true } } };

// How long to wait before each reconnect of a dropped reply stream; once they run out, the reply fails.
const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 4_000, 8_000];

const emptyAssistantMessage = (): ChatMessage => ({
  id: crypto.randomUUID(),
  role: 'assistant',
  content: '',
});

const errorMessage = (err: unknown): string =>
  err instanceof Error && err.message ? err.message : resources.chat.streamError;

export const useChatStream = ({
  reconnectDelaysMs = RECONNECT_DELAYS_MS,
}: UseChatStreamOptions = {}) => {
  const {
    history,
    reply: replyState,
    usage,
    sessionId,
    setHistory,
    setUsage,
    setSessionId,
  } = useChatStreamStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync: createSession } = useCreateSession(INLINE_ERROR);
  const { mutateAsync: sendMessage } = useSendMessage(INLINE_ERROR);

  const abortController = useRef<AbortController | null>(null);

  // Held in a ref so `streamMessage` needn't depend on sessionId: a mid-send `setSessionId` would re-render all of ChatContainer.
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const fail = useCallback(
    (err: unknown): ReplyEnd => {
      const error = errorMessage(err);
      setHistory((prev) => failReply(prev, error));
      return { status: 'failed', error };
    },
    [setHistory],
  );

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

  const applyFrame = useCallback(
    (frame: SseFrame): ReplyEnd | null => {
      const result = applyStreamEvent(useChatStreamStore.getState().history, frame);
      setHistory(result.history);
      if (result.usage) setUsage(result.usage);
      if (result.staleRunId) invalidateRun(queryClient, result.staleRunId);
      return result.end ?? null;
    },
    [queryClient, setHistory, setUsage],
  );

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

  // Follows the reply into the trailing assistant Message and settles it; aborted, `abort` already has.
  const followAndSettle = useCallback(
    async (streamId: string, followedSessionId: string, signal: AbortSignal, isNew = false) => {
      const end = await followStream({
        streamId,
        signal,
        reconnectDelaysMs,
        onEvent: applyFrame,
        onExpired: () => showSavedReply(queryClient, followedSessionId, setHistory),
      });
      if (!end) return;
      if (end.status !== 'failed') {
        invalidateCompletedStream(queryClient, followedSessionId);
        // A failed read leaves the meta row as the stream left it; the invalidation above reports the failure.
        const isCurrent = () => sessionIdRef.current === followedSessionId;
        void showSavedReplyMeta(queryClient, followedSessionId, setHistory, isCurrent).catch(
          () => undefined,
        );
      }
      settle(end, isNew ? followedSessionId : undefined);
    },
    [applyFrame, queryClient, reconnectDelaysMs, setHistory, settle],
  );

  // Send, then subscribe (ADR-0014): a new chat gets its Session first, and the send names the reply's stream.
  const streamMessage = useCallback(
    async ({
      model,
      mode = SendMessageBodyMode.direct,
      messages,
      sessionId: customSessionId,
    }: ChatHistoryStreamOptions) => {
      const controller = new AbortController();
      abortController.current = controller;
      const content = messages.at(-1)?.content ?? '';
      let activeSessionId = customSessionId ?? sessionIdRef.current;
      const isNewSession = !activeSessionId;
      // Nothing was persisted, so the refused message goes back to the composer to resend.
      const returnToComposer = (isMessageAllowanceReached = false) => {
        useChatStreamStore.setState({
          history: messages.slice(0, -1),
          reply: IDLE_REPLY,
          isMessageAllowanceReached,
        });
        useMessageStore.getState().setMessage(content);
      };

      useChatStreamStore.setState({
        reply: { status: 'sending', stopRequested: false },
        usage: null,
        streamId: null,
        isMessageAllowanceReached: false,
        history: [...messages, emptyAssistantMessage()],
      });

      try {
        if (!activeSessionId) {
          // The send checks the allowance, so a capped Guest would otherwise leave an empty Session behind.
          const allowance = await queryClient.fetchQuery({
            ...getGetMessageAllowanceQueryOptions(),
            staleTime: 0,
          });
          if (allowance.metered && allowance.remaining === 0) {
            throw new AppError(ErrorCode.MessageAllowanceReached, resources.chat.streamError);
          }
          const created = await createSession({ data: { title: content.slice(0, 50) } });
          activeSessionId = created.id;
          setSessionId(activeSessionId);
          // The sidebar can show it now, before its first reply.
          invalidateSessionList(queryClient);
        }

        // A tab left open past the worker's idle sleep: only a browser's ping gets through the edge.
        wakeWorker();
        const { streamId, runId } = await sendMessage({
          sessionId: activeSessionId,
          data: { content, mode, model: model as SendMessageBodyModel },
        });
        invalidateAfterSend(queryClient, activeSessionId);
        if (controller.signal.aborted) return;
        const sent = useChatStreamStore.getState().reply;
        useChatStreamStore.setState({ streamId, reply: { status: 'streaming' } });
        if (runId) {
          // The Run exists from the send on, so its progress and its Inspector tab show before the first Step.
          setHistory((prev) => [...prev.slice(0, -1), { ...prev.at(-1)!, runId, run: EMPTY_RUN }]);
          useInspectorStore.getState().showRun(runId);
        }
        // Stop was pressed before the send named the stream.
        if (sent.status === 'sending' && sent.stopRequested) void requestCancel(streamId);

        await followAndSettle(streamId, activeSessionId, controller.signal, isNewSession);
      } catch (err) {
        if (isAppError(err) && err.code === ErrorCode.MessageAllowanceReached) {
          returnToComposer(true);
          // The count shown may be stale (another tab), so resync it with the server's.
          invalidateMessageAllowance(queryClient);
          return;
        }
        // Aborted: `abort` has already settled the reply, and a newer one may be in flight.
        if (controller.signal.aborted) return;
        if (
          mode === SendMessageBodyMode.run &&
          isAppError(err) &&
          err.code === ErrorCode.Forbidden
        ) {
          returnToComposer();
          toast.error(err.message);
          return;
        }
        // A new chat that got its Session moves to it, so the failed reply stays on screen.
        settle(fail(err), isNewSession ? activeSessionId : undefined);
      } finally {
        if (abortController.current === controller) abortController.current = null;
      }
    },
    [
      createSession,
      fail,
      followAndSettle,
      queryClient,
      requestCancel,
      sendMessage,
      setHistory,
      setSessionId,
      settle,
    ],
  );

  // Re-attaches to a reply still in flight, say after a page reload: the stream replays from its
  // start into a fresh assistant Message after the saved ones, so nothing is missing or doubled.
  const resumeStream = useCallback(
    async ({ sessionId: resumedSessionId, streamId }: ResumeStreamOptions) => {
      const chat = useChatStreamStore.getState();
      // Already following it, or this tab just did and the Session read is not yet refreshed.
      if (isReplyInFlight(chat.reply) || chat.streamId === streamId) return;
      const controller = new AbortController();
      abortController.current = controller;
      useChatStreamStore.setState({
        reply: { status: 'streaming' },
        usage: null,
        sessionId: resumedSessionId,
        streamId,
        // A reload just after the worker persisted the reply already lists it; the replay replaces it.
        history: [...chat.history.filter((m) => m.id !== streamId), emptyAssistantMessage()],
      });
      try {
        await followAndSettle(streamId, resumedSessionId, controller.signal);
      } catch (err) {
        if (!controller.signal.aborted) settle(fail(err));
      } finally {
        if (abortController.current === controller) abortController.current = null;
      }
    },
    [fail, followAndSettle, settle],
  );

  // The stop button: the worker ends the stream as `cancelled`, which finishes the reply as usual.
  const stop = useCallback(async () => {
    const { reply: current, streamId } = useChatStreamStore.getState();
    if (current.status === 'sending') {
      // The send has not named the stream yet; it cancels once it does.
      useChatStreamStore.setState({ reply: { status: 'sending', stopRequested: true } });
      return;
    }
    if (current.status === 'streaming' && streamId) await requestCancel(streamId);
  }, [requestCancel]);

  // The new Session's route has rendered, so the reply rests at the end it reached.
  const clearPostStream = useCallback(() => {
    const { reply: current } = useChatStreamStore.getState();
    if (current.status === 'navigating') useChatStreamStore.setState({ reply: current.end });
  }, []);

  return {
    history,
    isStreaming: isReplyInFlight(replyState),
    isPostStreamNavigation: replyState.status === 'navigating',
    isReplyStopped: replyState.status === 'stopped',
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
