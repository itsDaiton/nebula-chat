import type { ChatMessage } from '@/modules/chat/types/types';

export const isStreamingAssistantPlaceholder = (message: ChatMessage, isStreaming: boolean) =>
  isStreaming && message.role === 'assistant' && !message.content;
