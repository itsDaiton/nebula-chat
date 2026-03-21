import type { ConversationWithMessages } from '@/modules/conversations/types/types';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type ChatMessageProps = {
  message: ChatMessage;
};

export type ChatInputProps = {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
};

export type ChatHistoryStreamOptions = {
  model: string;
  messages: ChatMessage[];
  conversationId?: string;
};

export type UseKeyboardHandlerProps = {
  message: string;
  isLoading: boolean;
  handleMessageSend: () => void;
};

export type UseMessageHandlerProps = {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
};

export type UseHandleSendMessageProps = {
  history: ChatMessage[];
  setHistory: (messages: ChatMessage[]) => void;
  streamMessage: (params: ChatHistoryStreamOptions) => Promise<void>;
};

export type ChatMessageSkeletonProps = {
  isUser?: boolean;
};

export type ChatInputBarProps = {
  onSend: (message: string) => void;
  isLoading: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
};

export type ChatEmptyStateProps = {
  conversationId: string | undefined;
};

export type ChatMessageListProps = {
  history: ChatMessage[];
  isStreaming: boolean;
};

export type UseConversationSyncParams = {
  conversationId: string | undefined;
  conversation: ConversationWithMessages | null;
  isLoadingConversation: boolean;
  isStreaming: boolean;
  setHistory: (messages: ChatMessage[]) => void;
  setConversationId: (id: string | undefined) => void;
};
