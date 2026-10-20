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
import { getListMessagesQueryKey } from '@/libs/api/generated/messages/messages';
import { readReplyStream } from '@/libs/api/generated/streams/streams';
import { ErrorCode } from '@/libs/api/generated/model/errorCode';
import type { SendMessageBodyModel } from '@/libs/api/generated/model/sendMessageBodyModel';
import type { ChatHistoryStreamOptions } from '@/modules/chat/types/types';
import { useNavigate } from 'react-router';
import { route } from '@/routing/routes';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { parseSseStream } from '@/modules/chat/utils/parseSseStream';
import { resources } from '@/resources';

// A failed send or stream renders inside the reply, so the global toaster stays out of it.
const INLINE_ERROR = { mutation: { meta: { inlineError: true } } };

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const useChatStream = () => {
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

  // Keep sessionId in a ref so streamMessage doesn't need it as a useCallback dep.
  // Without this, every setSessionId call (fired mid-send for a new session)
  // would recreate streamMessage → handleSendMessage → re-render the entire ChatContainer.
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

  // Send, then subscribe (ADR-0014): a new chat gets its Session first, and the send names the reply's stream.
  const streamMessage = useCallback(
    async ({ model, messages, sessionId: customSessionId }: ChatHistoryStreamOptions) => {
      const controller = new AbortController();
      abortController.current = controller;
      const content = messages.at(-1)?.content ?? '';
      let activeSessionId = customSessionId ?? sessionIdRef.current;
      const isNewSession = !activeSessionId;

      useChatStreamStore.setState({
        isStreaming: true,
        error: null,
        usage: null,
        isMessageAllowanceReached: false,
        history: [...messages, { id: crypto.randomUUID(), role: 'assistant', content: '' }],
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
          data: { content, mode: 'direct', model: model as SendMessageBodyModel },
        });
        void invalidateMessageAllowance();
        if (controller.signal.aborted) return;

        // The stream mutator resolves with the raw Response, though the generated type says string.
        const response = (await readReplyStream(
          streamId,
          undefined,
          controller.signal,
        )) as unknown as Response;
        if (!response.ok || !response.body) {
          const envelope = parseErrorEnvelope(await response.json().catch(() => null));
          throw new Error(envelope?.message ?? resources.chat.streamError);
        }

        for await (const { event, data } of parseSseStream(response.body)) {
          const parsed = parseJson(data);

          if (event === 'token') {
            const token = (parsed as { token?: unknown } | null)?.token;
            if (typeof token === 'string') appendToken(token);
          } else if (event === 'usage') {
            const { promptTokens, completionTokens, totalTokens } = parsed as Record<
              string,
              number
            >;
            setUsage({ promptTokens, completionTokens, totalTokens });
          } else if (event === 'error') {
            showReplyError(parseErrorEnvelope(parsed)?.message ?? resources.chat.streamError);
            setIsStreaming(false);
            return;
          } else {
            invalidateCompletedStream(activeSessionId);
            if (isNewSession) {
              // isStreaming intentionally stays true here — a useEffect in ChatContainer
              // will call clearPostStream() once sessionId from useParams is set,
              // guaranteeing isStreaming goes false only after the navigation has rendered.
              // (requestAnimationFrame was unreliable: it could fire before React processed
              // the navigation render, leaving a frame with isStreaming=false + no sessionId
              // → empty state flicker.)
              setIsPostStreamNavigation(true);
              void navigate(route.chat.session(activeSessionId), { replace: true });
            } else {
              setIsStreaming(false);
            }
            return;
          }
        }
        // The body closed without `end`: the connection dropped mid-reply.
        throw new Error(resources.chat.streamError);
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
      appendToken,
      createSession,
      invalidateCompletedStream,
      invalidateSessionList,
      invalidateMessageAllowance,
      navigate,
      queryClient,
      sendMessage,
      setSessionId,
      setIsPostStreamNavigation,
      setIsStreaming,
      setUsage,
      showReplyError,
    ],
  );

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
    abort,
    clearPostStream,
    setSessionId,
    setHistory,
    sessionId,
  };
};
