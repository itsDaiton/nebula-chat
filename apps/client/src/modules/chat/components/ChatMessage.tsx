import { memo } from 'react';
import { ChatAssistantMessage } from '@/modules/chat/components/ChatAssistantMessage';
import { ChatReadOnlyAssistantMessage } from '@/modules/chat/components/ChatReadOnlyAssistantMessage';
import { ChatUserMessage } from '@/modules/chat/components/ChatUserMessage';
import type { ChatMessageProps } from '@/modules/chat/types/types';
import { isUser } from '@/modules/chat/utils/isUser';

export const ChatMessage = memo(
  ({ message, onRegenerate, isStreaming, readOnly }: ChatMessageProps) => {
    if (isUser(message.role)) return <ChatUserMessage message={message} />;
    if (readOnly) return <ChatReadOnlyAssistantMessage message={message} />;
    return (
      <ChatAssistantMessage
        message={message}
        onRegenerate={onRegenerate}
        isStreaming={isStreaming}
      />
    );
  },
);

ChatMessage.displayName = 'ChatMessage';
