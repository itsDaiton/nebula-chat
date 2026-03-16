import { useCallback, useRef } from 'react';
import type { ChatHistoryStreamOptions } from '../types/types';
import { SERVER_CONFIG } from '../../../shared/config/serverConfig';
import { useNavigate } from 'react-router';
import { route } from '@/routes';
import { useConversationsContext } from '@/modules/conversations/context/ConversationsContext';
import { useChatStore } from '../stores/useChatStore';

export function useChatStream() {
  const {
    history,
    isStreaming,
    error,
    usage,
    conversationId,
    setHistory,
    setIsStreaming,
    setError,
    setUsage,
    setConversationId,
  } = useChatStore();
  const navigate = useNavigate();
  const { refetch: refetchConversations } = useConversationsContext();

  const abortController = useRef<AbortController | null>(null);
  const pendingNavigationId = useRef<string | null>(null);

  const abort = useCallback(() => {
    abortController.current?.abort();
    abortController.current = null;
    setIsStreaming(false);
  }, [setIsStreaming]);

  const streamMessage = useCallback(
    async ({ model, messages, conversationId: customConversationId }: ChatHistoryStreamOptions) => {
      setIsStreaming(true);
      setError(null);
      setUsage(null);
      pendingNavigationId.current = null;

      setHistory([...messages, { id: crypto.randomUUID(), role: 'assistant', content: '' }]);

      const controller = new AbortController();
      abortController.current = controller;

      try {
        const newUserMessage = messages.at(-1);

        const requestBody: any = {
          messages: [newUserMessage],
          model,
        };

        if (customConversationId || conversationId) {
          requestBody.conversationId = customConversationId || conversationId;
        }

        const response = await fetch(SERVER_CONFIG.getApiEndpoint('/api/chat/stream'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

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
                setIsStreaming(false);
                abortController.current = null;
                if (pendingNavigationId.current) {
                  void navigate(route.chat.conversation(pendingNavigationId.current), {
                    replace: true,
                  });
                  void refetchConversations();
                  pendingNavigationId.current = null;
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
                  const isNewConversation = !conversationId;
                  setConversationId(parsed.conversationId);
                  if (isNewConversation) {
                    pendingNavigationId.current = parsed.conversationId;
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
      conversationId,
      navigate,
      refetchConversations,
      setConversationId,
      setError,
      setHistory,
      setIsStreaming,
      setUsage,
    ],
  );

  return {
    history,
    isStreaming,
    error,
    usage,
    streamMessage,
    abort,
    setConversationId,
    setHistory,
    conversationId,
  };
}
