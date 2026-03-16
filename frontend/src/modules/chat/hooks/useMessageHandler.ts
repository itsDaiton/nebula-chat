import { useCallback } from 'react';
import type { UseMessageHandlerProps } from '../types/types';
import { useMessageStore } from '../stores/useMessageStore';

export const useMessageHandler = ({ onSendMessage, isLoading }: UseMessageHandlerProps) => {
  const { message, setMessage } = useMessageStore();

  const handleMessageSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  }, [message, onSendMessage, setMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      handleMessageSend();
    }
  };

  return {
    message,
    setMessage,
    handleSubmit,
    handleMessageSend,
  };
};
