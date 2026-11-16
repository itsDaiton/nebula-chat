import { memo } from 'react';
import { ChatAssistantMessage } from '@/modules/chat/components/ChatAssistantMessage';
import { ChatUserMessage } from '@/modules/chat/components/ChatUserMessage';
import type { ChatMessageProps } from '@/modules/chat/types/types';
import { isUser } from '@/modules/chat/utils/isUser';

export const ChatMessage = memo(({ message, onRegenerate, isStreaming }: ChatMessageProps) =>
  isUser(message.role) ? (
    <ChatUserMessage message={message} />
  ) : (
    <ChatAssistantMessage message={message} onRegenerate={onRegenerate} isStreaming={isStreaming} />
  ),
);

ChatMessage.displayName = 'ChatMessage';
