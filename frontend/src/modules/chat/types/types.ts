export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatMessageProps {
  message: ChatMessage;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export interface ChatHistoryStreamOptions {
  model: string;
  messages: ChatMessage[];
  conversationId?: string;
}

export interface UseKeyboardHandlerProps {
  message: string;
  isLoading: boolean;
  handleMessageSend: () => void;
}

export interface UseMessageHandlerProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export interface UseHandleSendMessageProps {
  history: ChatMessage[];
  setHistory: (messages: ChatMessage[]) => void;
  streamMessage: (params: ChatHistoryStreamOptions) => Promise<void>;
}

export interface ChatMessageSkeletonProps {
  isUser?: boolean;
}

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
