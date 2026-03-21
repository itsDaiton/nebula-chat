import { useCallback, useRef } from 'react';
import type { ChatHistoryStreamOptions } from '@/modules/chat/types/types';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import { useNavigate } from 'react-router';
import { route } from '@/routing/routes';
import { useConversationsStore } from '@/modules/conversations/stores/useConversationsStore';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';

export const useChatStream = () => {
  const {
    history,
    isStreaming,
    isPostStreamNavigation,
    error,
    usage,
    conversationId,
    setHistory,
    setIsStreaming,
    setIsPostStreamNavigation,
    setError,
    setUsage,
    setConversationId,
  } = useChatStreamStore();
  const navigate = useNavigate();
  const refetchConversations = useConversationsStore((state) => state.refetch);
  const prependConversation = useConversationsStore((state) => state.prependConversation);

  const abortController = useRef<AbortController | null>(null);
  const pendingNavigationId = useRef<string | null>(null);

  // Keep conversationId in a ref so streamMessage doesn't need it as a useCallback dep.
  // Without this, every setConversationId call (fired mid-stream on conversation-created)
  // would recreate streamMessage → handleSendMessage → re-render the entire ChatContainer.
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  const abort = useCallback(() => {
    abortController.current?.abort();
    abortController.current = null;
    setIsStreaming(false);
  }, [setIsStreaming]);

  const streamMessage = useCallback(
    async ({ model, messages, conversationId: customConversationId }: ChatHistoryStreamOptions) => {
      pendingNavigationId.current = null;

      const controller = new AbortController();
      abortController.current = controller;

      // Build the request body synchronously before any state updates.
      const newUserMessage = messages.at(-1);
      const requestBody: any = { messages: [newUserMessage], model };
      const activeConversationId = customConversationId ?? conversationIdRef.current;
      if (activeConversationId) {
        requestBody.conversationId = activeConversationId;
      }

      // Start the fetch BEFORE the state update. useChatStreamStore.setState uses
      // useSyncExternalStore which can trigger synchronous renders — doing it before
      // fetch() would delay the HTTP request by the cost of that render pass.
      const responseFetch = fetch(SERVER_CONFIG.getApiEndpoint('/api/chat/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // Now update UI state. The network request is already in flight.
      useChatStreamStore.setState({
        isStreaming: true,
        error: null,
        usage: null,
        history: [...messages, { id: crypto.randomUUID(), role: 'assistant', content: '' }],
      });

      try {
        const response = await responseFetch;

        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('Response body is null.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let currentEvent:
          | 'token'
          | 'usage'
          | 'error'
          | 'conversation-created'
          | 'user-message-created'
          | 'assistant-message-created'
          | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: conversation-created')) {
              currentEvent = 'conversation-created';
              continue;
            }
            if (line.startsWith('event: user-message-created')) {
              currentEvent = 'user-message-created';
              continue;
            }
            if (line.startsWith('event: assistant-message-created')) {
              currentEvent = 'assistant-message-created';
              continue;
            }
            if (line.startsWith('event: token')) {
              currentEvent = 'token';
              continue;
            }
            if (line.startsWith('event: usage')) {
              currentEvent = 'usage';
              continue;
            }
            if (line.startsWith('event: error')) {
              currentEvent = 'error';
              continue;
            }

            if (line.startsWith('data: ')) {
              const raw = line.replace('data: ', '').trim();

              if (raw === 'end') {
                abortController.current = null;
                if (pendingNavigationId.current) {
                  const navId = pendingNavigationId.current;
                  pendingNavigationId.current = null;
                  // Signal that we're in the post-stream navigation window.
                  // isStreaming intentionally stays true here — a useEffect in ChatContainer
                  // will call clearPostStream() once conversationId from useParams is set,
                  // guaranteeing isStreaming goes false only after the navigation has rendered.
                  // (requestAnimationFrame was unreliable: it could fire before React processed
                  // the navigation render, leaving a frame with isStreaming=false + no conversationId
                  // → empty state flicker.)
                  setIsPostStreamNavigation(true);
                  void navigate(route.chat.conversation(navId), { replace: true });
                  void refetchConversations();
                } else {
                  setIsStreaming(false);
                }
                return;
              }

              let parsed: any;
              try {
                parsed = JSON.parse(raw);
              } catch {
                continue;
              }

              if (currentEvent === 'conversation-created') {
                if (parsed.conversationId) {
                  const isNewConversation = !conversationIdRef.current;
                  setConversationId(parsed.conversationId);
                  if (isNewConversation) {
                    pendingNavigationId.current = parsed.conversationId;
                    prependConversation({
                      id: parsed.conversationId,
                      title: '...',
                      createdAt: new Date().toISOString(),
                    });
                  }
                }
                currentEvent = null;
                continue;
              }

              if (currentEvent === 'user-message-created') {
                currentEvent = null;
                continue;
              }

              if (currentEvent === 'assistant-message-created') {
                currentEvent = null;
                continue;
              }

              if (currentEvent === 'error') {
                const errorMsg = parsed.error || 'An error occurred during streaming.';
                setError(errorMsg);
                setHistory((prev) => {
                  const updated = [...prev];
                  const last = updated.at(-1);
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: errorMsg,
                    };
                  }
                  return updated;
                });
                setIsStreaming(false);
                abortController.current = null;
                return;
              }

              if (currentEvent === 'usage') {
                setUsage({
                  promptTokens: parsed.promptTokens,
                  completionTokens: parsed.completionTokens,
                  totalTokens: parsed.totalTokens,
                });
                currentEvent = null;
                continue;
              }

              if (currentEvent === 'token' && typeof parsed.token === 'string') {
                setHistory((prev) => {
                  const updated = [...prev];
                  const last = updated.at(-1);
                  if (last?.role !== 'assistant') {
                    return prev;
                  }
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.token,
                  };
                  return updated;
                });
                currentEvent = null;
              }
            }
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError((err as Error).message || 'Unknown error occurred');
        }
        setIsStreaming(false);
      } finally {
        abortController.current = null;
      }
    },
    [
      navigate,
      prependConversation,
      refetchConversations,
      setConversationId,
      setError,
      setHistory,
      setIsPostStreamNavigation,
      setIsStreaming,
      setUsage,
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
    setConversationId,
    setHistory,
    conversationId,
  };
};
