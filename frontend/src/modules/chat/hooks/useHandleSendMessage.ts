import { useCallback } from 'react';
import type { ChatMessage, UseHandleSendMessageProps } from '../types/types';

export const useHandleSendMessage = ({
  history,
  setHistory,
  streamMessage,
}: UseHandleSendMessageProps) => {
  const handleSendMessage = useCallback(
    async (message: string, selectedModel: string) => {
      const newUserMessage: ChatMessage = {
        role: 'user',
        content: message,
      };

      const updatedMessages = [...history, newUserMessage];
      setHistory(updatedMessages);

      try {
        await streamMessage({ messages: updatedMessages, model: selectedModel });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Streaming error:', err);
      }
    },
    [history, setHistory, streamMessage],
  );

  return { handleSendMessage };
};
