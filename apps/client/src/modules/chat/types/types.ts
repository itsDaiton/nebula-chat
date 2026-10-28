import type { Dispatch, SetStateAction } from 'react';
import type { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import type { ModelProvider } from '@/shared/types/types';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokenCount?: number | null;
  /** Set by the API once Messages carry how they were made (NEB-665); null for a Run answer. */
  model?: string | null;
  estimatedCostUsd?: number | null;
  runId?: string | null;
};

export type ChatMessageProps = {
  message: ChatMessage;
  /** Re-asks the prompt this reply answered; only the newest reply offers it. */
  onRegenerate?: () => void;
  /** The reply is still arriving, so there is nothing to copy or regenerate yet. */
  isStreaming?: boolean;
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
  /** How the reply is produced; a Direct reply when omitted. */
  mode?: SendMessageBodyMode;
  messages: ChatMessage[];
  sessionId?: string;
};

/** A reply still in flight to re-attach to; it lands after the Session's loaded history. */
export type ResumeStreamOptions = {
  sessionId: string;
  streamId: string;
};

/** How following a reply stream finished: at its end (or saved Message), at an `error`, or aborted. */
export type FollowOutcome = 'ended' | 'failed' | 'aborted';

/** Where a followed reply stream got to: the last event applied, and reconnects since then. */
export type StreamCursor = {
  lastEventId: string | undefined;
  retries: number;
};

export type StopButtonProps = {
  onStop: () => void;
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

export type ModelOption = {
  label: string;
  value: string;
  provider: ModelProvider;
  contextWindow: number;
};

export type ModelPickerState = {
  isOpen: boolean;
  search: string;
  setOpen: (isOpen: boolean) => void;
  setSearch: (search: string) => void;
};

export type ModelSelectProps = {
  selectedModel: string;
  onModelChange: (model: string) => void;
  /** The catalog to pick from; the client's own list until `GET /api/models` is read. */
  options?: ModelOption[];
};

export type ChatMessageListProps = {
  history: ChatMessage[];
  isStreaming: boolean;
  /** The newest reply was stopped by the User, so a note follows the thread. */
  isReplyStopped?: boolean;
  onRegenerate?: (prompt: string) => void;
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
  /** Stop was pressed before the send named the reply's stream. */
  isStopRequested: boolean;
  /** A Guest's send was refused because their message allowance is spent. */
  isMessageAllowanceReached: boolean;
  /** The newest reply was stopped by the User (kept in the client only: the server persists no marker). */
  isReplyStopped: boolean;
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

/** The events a reply stream carries (`GET /api/streams/{streamId}`). */
export type SseEvent = 'token' | 'usage' | 'error' | 'end';

/** One SSE event off a reply stream: its name, its raw `data` line and its stream entry id. */
export type SseFrame = {
  event: SseEvent;
  data: string;
  id?: string;
};
