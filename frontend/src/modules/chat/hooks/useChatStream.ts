import { useCallback, useRef, useState } from 'react';
import type { ChatHistoryStreamOptions, ChatMessage } from '../types/types';

export function useChatStream() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortController = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortController.current?.abort();
    abortController.current = null;
    setIsStreaming(false);
  }, []);

  const streamMessage = useCallback(async ({ model, messages }: ChatHistoryStreamOptions) => {
    setIsStreaming(true);
    setError(null);

    setHistory([...messages, { role: 'assistant', content: '' }]);

    const controller = new AbortController();
    abortController.current = controller;

    try {
      const response = await fetch('http://localhost:3000/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: token')) continue;

          if (line.startsWith('data: ')) {
            const raw = line.replace('data: ', '').trim();

            if (raw === 'end') {
              setIsStreaming(false);
              abortController.current = null;
              return;
            }

            let parsed;
            try {
              parsed = JSON.parse(raw);
            } catch {
              continue;
            }

            const token = parsed.token;
            if (typeof token === 'string') {
              setHistory((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + token,
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
  }, []);

  return {
    history,
    isStreaming,
    error,
    streamMessage,
    abort,
    setHistory,
  };
}
