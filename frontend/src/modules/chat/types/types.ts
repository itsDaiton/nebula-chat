export type MessageType = "user" | "bot";

export interface ChatMessage {
  id: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  isLoading?: boolean;
  isThinking?: boolean;
}

export interface ChatMessageProps {
  message: ChatMessage;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
}
