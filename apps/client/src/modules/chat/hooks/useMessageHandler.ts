import { useCallback } from 'react';
import type { ComponentProps } from 'react';
import { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import { useRunMode } from '@/modules/chat/hooks/useRunMode';
import type { UseMessageHandlerProps } from '@/modules/chat/types/types';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';

export const useMessageHandler = ({ onSendMessage, isLoading }: UseMessageHandlerProps) => {
  const { message, setMessage, resetRunMode } = useMessageStore();
  const { isRunMode } = useRunMode();

  const handleMessageSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message, isRunMode ? SendMessageBodyMode.run : SendMessageBodyMode.direct);
      setMessage('');
      // A Run is opted into per message.
      resetRunMode();
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  }, [isRunMode, message, onSendMessage, resetRunMode, setMessage]);

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
