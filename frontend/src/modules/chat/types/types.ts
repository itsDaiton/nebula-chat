import type { Dispatch, SetStateAction } from 'react';

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

export type ModelState = {
  selectedModel: string;
  setSelectedModel: Dispatch<SetStateAction<string>>;
};

type Usage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} | null;

export type ChatStreamState = {
  history: ChatMessage[];
  isStreaming: boolean;
  isSyncing: boolean;
  error: string | null;
  usage: Usage;
  conversationId?: string;
  setHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  setIsStreaming: (isStreaming: boolean) => void;
  setError: (error: string | null) => void;
  setUsage: (usage: Usage) => void;
  setConversationId: (id: string | undefined) => void;
};

export type MessageState = {
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
};

export type ModelSelectorState = {
  isSelectOpen: boolean;
  triggerWidth: number;
  setIsSelectOpen: (isOpen: boolean) => void;
  setTriggerWidth: (width: number) => void;
};
