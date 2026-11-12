import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppError, isAppError, parseErrorEnvelope } from '@nebula-chat/errors';
import {
  getGetSessionQueryKey,
  getListSessionsInfiniteQueryKey,
  useCreateSession,
} from '@/libs/api/generated/sessions/sessions';
import {
  getGetMessageAllowanceQueryKey,
  getGetMessageAllowanceQueryOptions,
  useSendMessage,
} from '@/libs/api/generated/chat/chat';
import {
  getListMessagesQueryKey,
  getListMessagesQueryOptions,
} from '@/libs/api/generated/messages/messages';
import { getGetRunQueryKey } from '@/libs/api/generated/runs/runs';
import { cancelReplyStream, readReplyStream } from '@/libs/api/generated/streams/streams';
import { ErrorCode } from '@/libs/api/generated/model/errorCode';
import type { Run } from '@/libs/api/generated/model/run';
import { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import type { SendMessageBodyModel } from '@/libs/api/generated/model/sendMessageBodyModel';
import type {
  ChatHistoryStreamOptions,
  ChatMessage,
  ReplyEnd,
  ResumeStreamOptions,
  SseEvent,
  StreamCursor,
  UseChatStreamOptions,
} from '@/modules/chat/types/types';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import { mapSessionMessages } from '@/modules/chat/utils/mapSessionMessages';
import { parseSseStream } from '@/modules/chat/utils/parseSseStream';
import { IDLE_REPLY, isReplyInFlight } from '@/modules/chat/utils/replyState';
import { EMPTY_RUN, applyRunEvent, parseRunEvent } from '@/modules/chat/utils/runProgress';
import { resources } from '@/resources';

// A failed send or stream renders inside the reply, so the global toaster stays out of it.
const INLINE_ERROR = { mutation: { meta: { inlineError: true } } };

// How long to wait before each reconnect of a dropped reply stream; once they run out, the reply fails.
const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 4_000, 8_000];

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// Stream entry ids are `<ms>-<seq>`, ordered by both parts.
const isAfter = (id: string, lastId: string | undefined): boolean => {
  if (lastId === undefined) return true;
  const [ms = 0, seq = 0] = id.split('-').map(Number);
  const [lastMs = 0, lastSeq = 0] = lastId.split('-').map(Number);
  return ms > lastMs || (ms === lastMs && seq > lastSeq);
};

/** Resolves after `ms`, or at once when `signal` aborts. */
const wait = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (ms <= 0 || signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

// The stream mutator resolves with the raw Response, though the generated type says string.
// A network failure resolves to null, for the caller to reconnect.
const openReplyStream = async (
  streamId: string,
  lastEventId: string | undefined,
  signal: AbortSignal,
): Promise<Response | null> => {
  try {
    return (await readReplyStream(
      streamId,
      lastEventId === undefined ? undefined : { lastEventId },
      undefined,
      signal,
    )) as unknown as Response;
  } catch {
    return null;
  }
};

// A refusal (4xx) will not change on retry, nor anything once retries run out; a 5xx may be a
// restarting server.
const assertRetryable = async (response: Response, canRetry: boolean): Promise<void> => {
  if (response.status >= 500 && canRetry) return;
  const envelope = parseErrorEnvelope(await response.json().catch(() => null));
  throw new Error(envelope?.message ?? resources.chat.streamError);
};

const emptyAssistantMessage = (): ChatMessage => ({
  id: crypto.randomUUID(),
  role: 'assistant',
  content: '',
});

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

  // SSE isn't a query, so the cache is invalidated rather than seeded (ADR-0012).
  const invalidateSessionList = useCallback(
    () => queryClient.invalidateQueries({ queryKey: getListSessionsInfiniteQueryKey() }),
    [queryClient],
  );

  // The server counts a message against the allowance once it persists it, so the counter refetches then.
  const invalidateMessageAllowance = useCallback(
    () => queryClient.invalidateQueries({ queryKey: getGetMessageAllowanceQueryKey() }),
    [queryClient],
  );

  // The stream carries only the token count; the saved reply knows its Model and cost, so the meta row takes them now rather than after a reload.
  const showSavedReplyMeta = useCallback(
    async (savedSessionId: string) => {
      const saved = await queryClient.fetchQuery({
        ...getListMessagesQueryOptions({ sessionId: savedSessionId }),
        staleTime: 0,
      });
      const reply = mapSessionMessages(saved).findLast(({ role }) => role === 'assistant');
      if (!reply || sessionIdRef.current !== savedSessionId) return;
      setHistory((prev) => {
        const last = prev.at(-1);
        if (last?.role !== 'assistant') return prev;
        const { model, estimatedCostUsd, runId, tokenCount } = reply;
        return [
          ...prev.slice(0, -1),
          { ...last, model, estimatedCostUsd, runId, tokenCount: tokenCount ?? last.tokenCount },
        ];
      });
    },
    [queryClient, setHistory],
  );

  const invalidateCompletedStream = useCallback(
    (completedSessionId: string) => {
      void invalidateSessionList();
      void queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(completedSessionId) });
      // A Run cached before it ended (one waiting on a Clarifying question) has moved on; ended Runs never change.
      void queryClient.invalidateQueries({
        predicate: ({ queryKey, state }) =>
          String(queryKey[0]).startsWith(getGetRunQueryKey('')[0]) &&
          !(state.data as Run | undefined)?.finishedAt,
      });
      // A failed read leaves the meta row as the stream left it; the invalidation above reports the failure.
      void showSavedReplyMeta(completedSessionId).catch(() => undefined);
    },
    [invalidateSessionList, queryClient, showSavedReplyMeta],
  );

  // The error replaces the reply's text; the returned end is for the caller to settle on.
  const failReply = useCallback(
    (message: string): ReplyEnd => {
      setHistory((prev) => {
        const updated = [...prev];
        const last = updated.at(-1);
        if (last?.role === 'assistant') {
          // A failed Run reports the `error` first, and the read stops there, before its `run-finished`.
          const run = last.run && { ...last.run, status: 'failed' as const };
          updated[updated.length - 1] = { ...last, content: message, ...(run && { run }) };
        }
        return updated;
      });
      return { status: 'failed', error: message };
    },
    [setHistory],
  );

  const appendToken = useCallback(
    (token: string) =>
      setHistory((prev) => {
        const updated = [...prev];
        const last = updated.at(-1);
        if (last?.role !== 'assistant') {
          return prev;
        }
        updated[updated.length - 1] = { ...last, content: last.content + token };
        return updated;
      }),
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

  // A reply stopped before its first token persists nothing, so its empty bubble goes too; a Run keeps its Steps.
  const dropEmptyReply = useCallback(
    () =>
      setHistory((prev) => {
        const last = prev.at(-1);
        return last?.role === 'assistant' && last.content === '' && !last.run
          ? prev.slice(0, -1)
          : prev;
      }),
    [setHistory],
  );

  // An expired stream leaves only the persisted reply, so the chat shows the Session's saved Messages.
  const showSavedReply = useCallback(
    async (savedSessionId: string) => {
      const saved = await queryClient.fetchQuery({
        ...getListMessagesQueryOptions({ sessionId: savedSessionId }),
        staleTime: 0,
      });
      setHistory(mapSessionMessages(saved));
    },
    [queryClient, setHistory],
  );

  // A Run's Step or end changes its progress above the answer, and the Run the Inspector may be showing.
  const applyRunFrame = useCallback(
    (event: SseEvent, data: unknown) => {
      const runEvent = parseRunEvent(event, data);
      if (!runEvent) return;
      setHistory((prev) => {
        const last = prev.at(-1);
        return last?.role === 'assistant'
          ? [...prev.slice(0, -1), applyRunEvent(last, runEvent)]
          : prev;
      });
      const runId = useChatStreamStore.getState().history.at(-1)?.runId;
      if (runId) void queryClient.invalidateQueries({ queryKey: getGetRunQueryKey(runId) });
    },
    [queryClient, setHistory],
  );

  // Applies one event to the reply; an end means the stream is over.
  const applyEvent = useCallback(
    (event: SseEvent, data: string): ReplyEnd | null => {
      const parsed = parseJson(data);
      if (event === 'token') {
        const token = (parsed as { token?: unknown } | null)?.token;
        if (typeof token === 'string') appendToken(token);
        return null;
      }
      if (event === 'usage') {
        const { promptTokens, completionTokens, totalTokens } = parsed as Record<string, number>;
        setUsage({ promptTokens, completionTokens, totalTokens });
        // The saved Message carries this count, so the meta row shows it now rather than after a reload.
        setHistory((prev) => {
          const last = prev.at(-1);
          return last?.role === 'assistant'
            ? [...prev.slice(0, -1), { ...last, tokenCount: totalTokens }]
            : prev;
        });
        return null;
      }
      if (event === 'step-started' || event === 'step-finished' || event === 'run-finished') {
        applyRunFrame(event, parsed);
        return null;
      }
      if (event === 'error') {
        const end = failReply(parseErrorEnvelope(parsed)?.message ?? resources.chat.streamError);
        // A failed Run still reports its `run-finished`, which the Inspector's Run waits on, so it reads on to `end`.
        return useChatStreamStore.getState().history.at(-1)?.run ? null : end;
      }
      const last = useChatStreamStore.getState().history.at(-1);
      if (last?.run?.status === 'failed') return { status: 'failed', error: last.content };
      // `end`, also when the User stopped the reply: what streamed is the saved reply.
      if ((parsed as { reason?: unknown } | null)?.reason === 'cancelled') {
        dropEmptyReply();
        return { status: 'stopped' };
      }
      return IDLE_REPLY;
    },
    [appendToken, applyRunFrame, dropEmptyReply, failReply, setHistory, setUsage],
  );

  // Reads one connection's body; null when it closed or dropped before the stream was over.
  const readReply = useCallback(
    async (body: ReadableStream<Uint8Array>, cursor: StreamCursor): Promise<ReplyEnd | null> => {
      try {
        for await (const { event, data, id } of parseSseStream(body)) {
          if (id !== undefined) {
            // A reconnect resumes after `lastEventId`; anything at or before it is already shown.
            if (!isAfter(id, cursor.lastEventId)) continue;
            cursor.lastEventId = id;
            cursor.retries = 0;
          }
          const end = applyEvent(event, data);
          if (end) return end;
        }
      } catch {
        // The connection dropped mid-body: the caller reconnects.
      }
      return null;
    },
    [applyEvent],
  );

  // Renders a reply stream into the trailing assistant Message, reconnecting after the last event
  // it saw (ADR-0014); an expired stream falls back to the saved Message. Null once aborted; throws
  // once retries run out.
  const followStream = useCallback(
    async (
      streamId: string,
      followedSessionId: string,
      signal: AbortSignal,
    ): Promise<ReplyEnd | null> => {
      const cursor: StreamCursor = { lastEventId: undefined, retries: 0 };
      while (!signal.aborted) {
        const response = await openReplyStream(streamId, cursor.lastEventId, signal);
        if (response?.status === 404) {
          await showSavedReply(followedSessionId);
          return IDLE_REPLY;
        }
        if (response && (!response.ok || !response.body)) {
          await assertRetryable(response, cursor.retries < reconnectDelaysMs.length);
        } else if (response?.body) {
          const end = await readReply(response.body, cursor);
          if (end) return end;
        }
        if (signal.aborted) break;

        // The body closed without `end`, or never opened: the connection dropped mid-reply.
        const delay = reconnectDelaysMs[cursor.retries];
        if (delay === undefined) throw new Error(resources.chat.streamError);
        cursor.retries += 1;
        await wait(delay, signal);
      }
      return null;
    },
    [readReply, reconnectDelaysMs, showSavedReply],
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
          void invalidateSessionList();
        }

        const { streamId, runId } = await sendMessage({
          sessionId: activeSessionId,
          data: { content, mode, model: model as SendMessageBodyModel },
        });
        void invalidateMessageAllowance();
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

        const end = await followStream(streamId, activeSessionId, controller.signal);
        // Aborted: `abort` has already settled the reply.
        if (!end) return;
        if (end.status !== 'failed') invalidateCompletedStream(activeSessionId);
        settle(end, isNewSession ? activeSessionId : undefined);
      } catch (err) {
        if (isAppError(err) && err.code === ErrorCode.MessageAllowanceReached) {
          // Nothing was persisted, so the refused message goes back to the composer to resend.
          useChatStreamStore.setState({
            history: messages.slice(0, -1),
            reply: IDLE_REPLY,
            isMessageAllowanceReached: true,
          });
          useMessageStore.getState().setMessage(content);
          // The count shown may be stale (another tab), so resync it with the server's.
          void invalidateMessageAllowance();
          return;
        }
        // Aborted: `abort` has already settled the reply, and a newer one may be in flight.
        if (controller.signal.aborted) return;
        if (
          mode === SendMessageBodyMode.run &&
          isAppError(err) &&
          err.code === ErrorCode.Forbidden
        ) {
          // Nothing was persisted for a refused Run, so the message goes back to the composer.
          useChatStreamStore.setState({ history: messages.slice(0, -1), reply: IDLE_REPLY });
          useMessageStore.getState().setMessage(content);
          toast.error(err.message);
          return;
        }
        const end = failReply(
          err instanceof Error && err.message ? err.message : resources.chat.streamError,
        );
        // A new chat that got its Session moves to it, so the failed reply stays on screen.
        settle(end, isNewSession ? activeSessionId : undefined);
      } finally {
        if (abortController.current === controller) abortController.current = null;
      }
    },
    [
      createSession,
      failReply,
      followStream,
      invalidateCompletedStream,
      invalidateSessionList,
      invalidateMessageAllowance,
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
        const end = await followStream(streamId, resumedSessionId, controller.signal);
        if (!end) return;
        if (end.status !== 'failed') invalidateCompletedStream(resumedSessionId);
        settle(end);
      } catch (err) {
        if (controller.signal.aborted) return;
        settle(
          failReply(err instanceof Error && err.message ? err.message : resources.chat.streamError),
        );
      } finally {
        if (abortController.current === controller) abortController.current = null;
      }
    },
    [failReply, followStream, invalidateCompletedStream, settle],
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
