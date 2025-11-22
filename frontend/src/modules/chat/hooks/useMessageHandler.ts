import { useState, useCallback } from 'react';

interface UseMessageHandlerProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const useMessageHandler = ({ onSendMessage, isLoading }: UseMessageHandlerProps) => {
  const [message, setMessage] = useState('');

  const resetTextarea = useCallback(() => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.style.height = 'auto';
    }
  }, []);

  const handleMessageSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      resetTextarea();
    }
  }, [message, onSendMessage, resetTextarea]);

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
