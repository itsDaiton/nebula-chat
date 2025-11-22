export type MessageType = 'user' | 'bot';

export interface ChatMessage {
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

export interface ChatStreamOptions {
  message: string;
  model: string;
}

export interface ChatHistoryStreamOptions {
  model: string;
  messages: ChatMessage[];
}

export interface UseKeyboardHandlerProps {
  message: string;
  isLoading: boolean;
  handleMessageSend: () => void;
}
