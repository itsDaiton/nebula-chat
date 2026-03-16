import { useCallback } from 'react';
import type { ChatMessage, UseHandleSendMessageProps } from '../types/types';
import { useChatStreamStore } from '../stores/useChatStreamStore';

export const useHandleSendMessage = ({
  history,
  setHistory,
  streamMessage,
}: UseHandleSendMessageProps) => {
  const { setIsStreaming } = useChatStreamStore();
  const handleSendMessage = useCallback(
    async (message: string, selectedModel: string) => {
      const newUserMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
      };

      const updatedMessages = [...history, newUserMessage];
      setHistory(updatedMessages);

      try {
        setIsStreaming(true);
        await streamMessage({ messages: updatedMessages, model: selectedModel });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Streaming error:', err);
      }
    },
    [history, setHistory, streamMessage, setIsStreaming],
  );

  return { handleSendMessage };
};
