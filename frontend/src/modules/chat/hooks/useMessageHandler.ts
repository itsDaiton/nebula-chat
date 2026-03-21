import { useCallback } from 'react';
import type { ComponentProps } from 'react';
import type { UseMessageHandlerProps } from '@/modules/chat/types/types';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';

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

  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = (e) => {
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
