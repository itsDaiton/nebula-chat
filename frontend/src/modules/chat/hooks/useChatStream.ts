import { useCallback, useRef, useState } from 'react';
import type { ChatHistoryStreamOptions, ChatMessage } from '../types/types';
import { SERVER_CONFIG } from '../../../shared/config/serverConfig';
import { v4 as uuidv4 } from 'uuid';

export function useChatStream() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null>(null);
  const [conversationId] = useState<string>(() => uuidv4());

  const abortController = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortController.current?.abort();
    abortController.current = null;
    setIsStreaming(false);
  }, []);

  const streamMessage = useCallback(
    async ({ model, messages, conversationId: customConversationId }: ChatHistoryStreamOptions) => {
      setIsStreaming(true);
      setError(null);
      setUsage(null);

      setHistory([...messages, { role: 'assistant', content: '' }]);

      const controller = new AbortController();
      abortController.current = controller;

      try {
        const response = await fetch(SERVER_CONFIG.getApiEndpoint('/api/chat/stream'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            model,
            conversationId: customConversationId || conversationId,
          }),
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
        let currentEvent: 'token' | 'usage' | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: token')) {
              currentEvent = 'token';
              continue;
            }
            if (line.startsWith('event: usage')) {
              currentEvent = 'usage';
              continue;
            }

            if (line.startsWith('data: ')) {
              const raw = line.replace('data: ', '').trim();

              if (raw === 'end') {
                setIsStreaming(false);
                abortController.current = null;
                return;
              }

              let parsed: any;
              try {
                parsed = JSON.parse(raw);
              } catch {
                continue;
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
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.token,
                  };
                  return updated;
                });
              }
            }

            if (line.startsWith('event: error')) {
              setError('An error occurred during streaming.');
              setIsStreaming(false);
              abortController.current = null;
              return;
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
    [conversationId],
  );

  return {
    history,
    isStreaming,
    error,
    usage,
    streamMessage,
    abort,
    setHistory,
    conversationId,
  };
}
