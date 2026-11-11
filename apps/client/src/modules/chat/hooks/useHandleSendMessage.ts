import { useCallback } from 'react';
import type { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import type { ChatMessage, UseHandleSendMessageProps } from '@/modules/chat/types/types';

export const useHandleSendMessage = ({ history, streamMessage }: UseHandleSendMessageProps) => {
  const handleSendMessage = useCallback(
    async (message: string, selectedModel: string, mode?: SendMessageBodyMode) => {
      const newUserMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
      };

      const updatedMessages = [...history, newUserMessage];

      try {
        await streamMessage({ messages: updatedMessages, model: selectedModel, mode });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Streaming error:', err);
      }
    },
    [history, streamMessage],
  );

  return { handleSendMessage };
};
