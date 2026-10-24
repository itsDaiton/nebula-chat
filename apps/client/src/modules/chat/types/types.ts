import type { Dispatch, SetStateAction } from 'react';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
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
  /** Stops the streaming reply; while one streams, it replaces the send button. */
  onStop?: () => void;
};

export type ChatHistoryStreamOptions = {
  model: string;
  messages: ChatMessage[];
  sessionId?: string;
};

/** A reply still in flight to re-attach to: its Session, its stream and the saved Messages before it. */
export type ResumeStreamOptions = {
  sessionId: string;
  streamId: string;
  messages: ChatMessage[];
};

export type UseChatStreamOptions = {
  /** The wait before each reconnect of a dropped reply stream; once they run out, the reply fails. */
  reconnectDelaysMs?: readonly number[];
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
  onStop?: () => void;
};

export type ChatEmptyStateProps = {
  sessionId: string | undefined;
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
  isPostStreamNavigation: boolean;
  error: string | null;
  usage: Usage;
  sessionId?: string;
  /** The reply stream being followed (or last followed): what the stop button cancels. */
  streamId: string | null;
  /** A Guest's send was refused because their message allowance is spent. */
  isMessageAllowanceReached: boolean;
  setHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  setIsStreaming: (isStreaming: boolean) => void;
  setIsPostStreamNavigation: (v: boolean) => void;
  setError: (error: string | null) => void;
  setUsage: (usage: Usage) => void;
  setSessionId: (id: string | undefined) => void;
  clearMessageAllowanceReached: () => void;
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

/** The events a reply stream carries (`GET /api/streams/{streamId}`). */
export type SseEvent = 'token' | 'usage' | 'error' | 'end';

/** One SSE event off a reply stream: its name, its raw `data` line and its stream entry id. */
export type SseFrame = {
  event: SseEvent;
  data: string;
  id?: string;
};
