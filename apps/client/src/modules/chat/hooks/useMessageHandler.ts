import { useCallback } from 'react';
import type { ComponentProps } from 'react';
import { useRunMode } from '@/modules/chat/hooks/useRunMode';
import type { UseMessageHandlerProps } from '@/modules/chat/types/types';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';

export const useMessageHandler = ({ onSendMessage, isLoading }: UseMessageHandlerProps) => {
  const { message, setMessage } = useMessageStore();
  const { replyMode } = useRunMode();

  const handleMessageSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message, replyMode);
      setMessage('');
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  }, [replyMode, message, onSendMessage, setMessage]);

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
