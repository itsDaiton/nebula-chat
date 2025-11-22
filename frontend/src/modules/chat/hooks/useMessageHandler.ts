import { useState, useCallback } from 'react';
import type { UseMessageHandlerProps } from '../types/types';

export const useMessageHandler = ({ onSendMessage, isLoading }: UseMessageHandlerProps) => {
  const [message, setMessage] = useState('');

  const handleMessageSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  }, [message, onSendMessage]);

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
