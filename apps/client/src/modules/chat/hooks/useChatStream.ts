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
import { cancelReplyStream, readReplyStream } from '@/libs/api/generated/streams/streams';
import { ErrorCode } from '@/libs/api/generated/model/errorCode';
import type { SendMessageBodyModel } from '@/libs/api/generated/model/sendMessageBodyModel';
import type {
  ChatHistoryStreamOptions,
  ChatMessage,
  FollowOutcome,
  ResumeStreamOptions,
  SseEvent,
  StreamCursor,
  UseChatStreamOptions,
} from '@/modules/chat/types/types';
import { useNavigate } from '@tanstack/react-router';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { mapSessionMessages } from '@/modules/chat/utils/mapSessionMessages';
import { parseSseStream } from '@/modules/chat/utils/parseSseStream';
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
    isStreaming,
    isPostStreamNavigation,
    error,
    usage,
    sessionId,
    setHistory,
    setIsStreaming,
    setIsPostStreamNavigation,
    setError,
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

  const invalidateCompletedStream = useCallback(
    (completedSessionId: string) => {
      void invalidateSessionList();
      void queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(completedSessionId) });
    },
    [invalidateSessionList, queryClient],
  );

  const showReplyError = useCallback(
    (message: string) => {
      setError(message);
      setHistory((prev) => {
        const updated = [...prev];
        const last = updated.at(-1);
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: message };
        }
        return updated;
      });
    },
    [setError, setHistory],
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
    setIsStreaming(false);
  }, [setIsStreaming]);

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

  // A reply stopped before its first token persists nothing, so its empty bubble goes too.
  const dropEmptyReply = useCallback(
    () =>
      setHistory((prev) => {
        const last = prev.at(-1);
        return last?.role === 'assistant' && last.content === '' ? prev.slice(0, -1) : prev;
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

  // Applies one event to the reply; an outcome means the stream is over.
  const applyEvent = useCallback(
    (event: SseEvent, data: string): FollowOutcome | null => {
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
      if (event === 'error') {
        showReplyError(parseErrorEnvelope(parsed)?.message ?? resources.chat.streamError);
        return 'failed';
      }
      // `end`, also when the User stopped the reply: what streamed is the saved reply.
      if ((parsed as { reason?: unknown } | null)?.reason === 'cancelled') dropEmptyReply();
      return 'ended';
    },
    [appendToken, dropEmptyReply, setHistory, setUsage, showReplyError],
  );

  // Reads one connection's body; null when it closed or dropped before the stream was over.
  const readReply = useCallback(
    async (
      body: ReadableStream<Uint8Array>,
      cursor: StreamCursor,
    ): Promise<FollowOutcome | null> => {
      try {
        for await (const { event, data, id } of parseSseStream(body)) {
          if (id !== undefined) {
            // A reconnect resumes after `lastEventId`; anything at or before it is already shown.
            if (!isAfter(id, cursor.lastEventId)) continue;
            cursor.lastEventId = id;
            cursor.retries = 0;
          }
          const outcome = applyEvent(event, data);
          if (outcome) return outcome;
        }
      } catch {
        // The connection dropped mid-body: the caller reconnects.
      }
      return null;
    },
    [applyEvent],
  );

  // Renders a reply stream into the trailing assistant Message, reconnecting after the last event
  // it saw (ADR-0014); an expired stream falls back to the saved Message. Throws once retries run out.
  const followStream = useCallback(
    async (
      streamId: string,
      followedSessionId: string,
      signal: AbortSignal,
    ): Promise<FollowOutcome> => {
      const cursor: StreamCursor = { lastEventId: undefined, retries: 0 };
      while (!signal.aborted) {
        const response = await openReplyStream(streamId, cursor.lastEventId, signal);
        if (response?.status === 404) {
          await showSavedReply(followedSessionId);
          return 'ended';
        }
        if (response && (!response.ok || !response.body)) {
          await assertRetryable(response, cursor.retries < reconnectDelaysMs.length);
        } else if (response?.body) {
          const outcome = await readReply(response.body, cursor);
          if (outcome) return outcome;
        }
        if (signal.aborted) break;

        // The body closed without `end`, or never opened: the connection dropped mid-reply.
        const delay = reconnectDelaysMs[cursor.retries];
        if (delay === undefined) throw new Error(resources.chat.streamError);
        cursor.retries += 1;
        await wait(delay, signal);
      }
      return 'aborted';
    },
    [readReply, reconnectDelaysMs, showSavedReply],
  );

  // Send, then subscribe (ADR-0014): a new chat gets its Session first, and the send names the reply's stream.
  const streamMessage = useCallback(
    async ({
      model,
      mode = 'direct',
      messages,
      sessionId: customSessionId,
    }: ChatHistoryStreamOptions) => {
      const controller = new AbortController();
      abortController.current = controller;
      const content = messages.at(-1)?.content ?? '';
      let activeSessionId = customSessionId ?? sessionIdRef.current;
      const isNewSession = !activeSessionId;

      useChatStreamStore.setState({
        isStreaming: true,
        error: null,
        usage: null,
        streamId: null,
        isStopRequested: false,
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

        const { streamId } = await sendMessage({
          sessionId: activeSessionId,
          data: { content, mode, model: model as SendMessageBodyModel },
        });
        void invalidateMessageAllowance();
        if (controller.signal.aborted) return;
        useChatStreamStore.setState({ streamId });
        // Stop was pressed before the send named the stream.
        if (useChatStreamStore.getState().isStopRequested) void requestCancel(streamId);

        const outcome = await followStream(streamId, activeSessionId, controller.signal);
        if (outcome === 'failed') {
          setIsStreaming(false);
        } else if (outcome === 'ended') {
          invalidateCompletedStream(activeSessionId);
          if (isNewSession) {
            // isStreaming stays true until ChatContainer's `clearPostStream()` runs once the route has a sessionId, so the navigation renders first;
            // requestAnimationFrame could fire early and flash the empty state.
            setIsPostStreamNavigation(true);
            void navigate({ to: '/s/$id', params: { id: activeSessionId }, replace: true });
          } else {
            setIsStreaming(false);
          }
        }
      } catch (err) {
        if (isAppError(err) && err.code === ErrorCode.MessageAllowanceReached) {
          // Nothing was persisted, so the refused message goes back to the composer to resend.
          useChatStreamStore.setState({
            history: messages.slice(0, -1),
            isStreaming: false,
            isMessageAllowanceReached: true,
          });
          useMessageStore.getState().setMessage(content);
          // The count shown may be stale (another tab), so resync it with the server's.
          void invalidateMessageAllowance();
          return;
        }
        if (!controller.signal.aborted) {
          showReplyError(
            err instanceof Error && err.message ? err.message : resources.chat.streamError,
          );
        }
        setIsStreaming(false);
      } finally {
        if (abortController.current === controller) abortController.current = null;
      }
    },
    [
      createSession,
      followStream,
      invalidateCompletedStream,
      invalidateSessionList,
      invalidateMessageAllowance,
      navigate,
      queryClient,
      requestCancel,
      sendMessage,
      setSessionId,
      setIsPostStreamNavigation,
      setIsStreaming,
      showReplyError,
    ],
  );

  // Re-attaches to a reply still in flight, say after a page reload: the stream replays from its
  // start into a fresh assistant Message after the saved ones, so nothing is missing or doubled.
  const resumeStream = useCallback(
    async ({ sessionId: resumedSessionId, streamId }: ResumeStreamOptions) => {
      const chat = useChatStreamStore.getState();
      // Already following it, or this tab just did and the Session read is not yet refreshed.
      if (chat.isStreaming || chat.streamId === streamId) return;
      const controller = new AbortController();
      abortController.current = controller;
      useChatStreamStore.setState({
        isStreaming: true,
        error: null,
        usage: null,
        sessionId: resumedSessionId,
        streamId,
        isStopRequested: false,
        // A reload just after the worker persisted the reply already lists it; the replay replaces it.
        history: [...chat.history.filter((m) => m.id !== streamId), emptyAssistantMessage()],
      });
      try {
        const outcome = await followStream(streamId, resumedSessionId, controller.signal);
        if (outcome === 'ended') invalidateCompletedStream(resumedSessionId);
      } catch (err) {
        if (!controller.signal.aborted) {
          showReplyError(
            err instanceof Error && err.message ? err.message : resources.chat.streamError,
          );
        }
      } finally {
        setIsStreaming(false);
        if (abortController.current === controller) abortController.current = null;
      }
    },
    [followStream, invalidateCompletedStream, setIsStreaming, showReplyError],
  );

  // The stop button: the worker ends the stream as `cancelled`, which finishes the reply as usual.
  const stop = useCallback(async () => {
    const { isStreaming: streaming, streamId } = useChatStreamStore.getState();
    if (!streaming) return;
    if (!streamId) {
      // The send has not named the stream yet; it cancels once it does.
      useChatStreamStore.setState({ isStopRequested: true });
      return;
    }
    await requestCancel(streamId);
  }, [requestCancel]);

  // Atomically clears both isStreaming and isPostStreamNavigation in one setState call
  // so ChatContainer sees a consistent state in a single render.
  const clearPostStream = useCallback(() => {
    useChatStreamStore.setState({ isStreaming: false, isPostStreamNavigation: false });
  }, []);

  return {
    history,
    isStreaming,
    isPostStreamNavigation,
    error,
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
