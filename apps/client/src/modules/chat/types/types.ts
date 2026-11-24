import type { Dispatch, SetStateAction } from 'react';
import type { RunStatus } from '@/libs/api/generated/model/runStatus';
import type { useSendMessage } from '@/libs/api/generated/chat/chat';
import type { CreateSessionBodyReplyMode } from '@/libs/api/generated/model/createSessionBodyReplyMode';
import type { SendMessageBodyModel } from '@/libs/api/generated/model/sendMessageBodyModel';
import type { useCreateSession } from '@/libs/api/generated/sessions/sessions';
import type { Step } from '@/libs/api/generated/model/step';
import type { StepStatus } from '@/libs/api/generated/model/stepStatus';
import type { ModelProvider } from '@/shared/types/types';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokenCount?: number | null;
  /** How the Message was made; null means not available (a user Message, a Run answer or an older reply). */
  model?: string | null;
  estimatedCostUsd?: number | null;
  runId?: string | null;
  contextTokens?: number | null;
  contextMessages?: number | null;
  /** The Run producing this reply, as its stream reports it; absent for a Direct reply or a loaded Message. */
  run?: RunProgress;
};

export type RunStepProgress = {
  stepId: string;
  attempt: number;
  phase: Step['phase'];
  agent: string;
  label: string;
  status: StepStatus;
  /** The Orchestrator turn the Step belongs to; 0 outside the Orchestrator's loop. */
  turn: number;
  /** The turn Step that launched a delegate Step; null for every other Step. */
  parentStepId: string | null;
};

/** A Step in its group, indented under the Step that launched it. */
export type RunProgressRow = {
  step: RunStepProgress;
  depth: number;
};

export type RunProgressGroup = {
  key: string;
  kind: 'intake' | 'turn' | 'output';
  turn: number;
  rows: RunProgressRow[];
};

export type RunProgressGroupProps = {
  group: RunProgressGroup;
  isStreaming: boolean;
};

export type RunProgressStepProps = {
  step: RunStepProgress;
  isStreaming: boolean;
  /** A delegate under its turn: `last` closes the rail that joins the turn's delegates. */
  rail?: 'mid' | 'last';
};

type RunEndStatus = Extract<RunStatus, 'completed' | 'partial' | 'failed' | 'cancelled'>;

/** A Run's Steps in the order they first started, and its end status once the stream reports it. */
export type RunProgress = {
  steps: RunStepProgress[];
  status: RunEndStatus | null;
};

/** A Run event off a reply stream, once its data has been validated. */
export type RunEvent =
  | ({ type: 'step-started' } & Omit<RunStepProgress, 'status'>)
  | { type: 'step-finished'; stepId: string; status: Exclude<StepStatus, 'running'> }
  | { type: 'run-finished'; runId: string; status: RunEndStatus };

export type RunCardProps = {
  runId: string;
  /** What the stream reported; it wins over the saved Run while the reply streams. */
  live?: RunProgress;
  /** The Run's stream is still open, so a Step without an end is still running. */
  isStreaming?: boolean;
};

export type RunEndNoteProps = {
  run: RunProgress;
};

export type RunCardState = {
  /** The User's choice per Run id; a Run without one is open while it streams. */
  expanded: Record<string, boolean>;
  setExpanded: (runId: string, isExpanded: boolean) => void;
};

export type ChatMessageProps = {
  message: ChatMessage;
  /** Re-asks the prompt this reply answered; only the newest reply offers it. */
  onRegenerate?: () => void;
  /** The reply is still arriving, so there is nothing to copy or regenerate yet. */
  isStreaming?: boolean;
  /** An Admin's view of someone else's Session: no Run controls, no regenerate. */
  readOnly?: boolean;
};

export type ChatInputProps = {
  onSendMessage: (message: string, mode: CreateSessionBodyReplyMode) => void;
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
  mode?: CreateSessionBodyReplyMode;
  messages: ChatMessage[];
  sessionId?: string;
};

/** A reply still in flight to re-attach to; it lands after the Session's loaded history. */
export type ResumeStreamOptions = {
  sessionId: string;
  streamId: string;
};

/** Where a reply rests once nothing is in flight; `idle` also covers one that finished normally. */
export type ReplyEnd =
  { status: 'idle' } | { status: 'stopped' } | { status: 'failed'; error: string };

// The newest reply's lifecycle: idle → sending → streaming → an end. `navigating` holds that end
// while a new chat moves to its Session's route, so the empty state never flashes.
export type ReplyState =
  | ReplyEnd
  | { status: 'sending'; stopRequested: boolean }
  | { status: 'streaming' }
  | { status: 'navigating'; end: ReplyEnd };

/** The chat after one stream event; `end` only when the event ends the reply. */
export type StreamEventResult = {
  history: ChatMessage[];
  end?: ReplyEnd;
  usage?: NonNullable<Usage>;
  /** A Step or the Run finished, so the cached Run read the Inspector shows must refetch. */
  staleRunId?: string;
};

/** Follows one reply stream: `onEvent` applies a frame, `onExpired` shows the saved reply instead. */
export type FollowStreamOptions = {
  streamId: string;
  signal: AbortSignal;
  reconnectDelaysMs: readonly number[];
  onEvent: (frame: SseFrame) => ReplyEnd | null;
  onExpired: () => Promise<void>;
  open?: (
    streamId: string,
    lastEventId: string | undefined,
    signal: AbortSignal,
  ) => Promise<Response | null>;
};

/** Where a followed reply lands; `isCurrent` turns false once another Session is on screen. */
export type ReplySink = {
  getHistory: () => ChatMessage[];
  setHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  setUsage: (usage: Usage) => void;
  isCurrent: (sessionId: string) => boolean;
};

export type FollowReplyOptions = {
  streamId: string;
  sessionId: string;
  signal: AbortSignal;
  reconnectDelaysMs: readonly number[];
  sink: ReplySink;
};

export type CreateSessionMutation = ReturnType<typeof useCreateSession>['mutateAsync'];

export type SendMessageMutation = ReturnType<typeof useSendMessage>['mutateAsync'];

export type PostMessageOptions = {
  sessionId: string;
  content: string;
  mode: CreateSessionBodyReplyMode;
  model: SendMessageBodyModel;
};

/** How a send that never streamed ends: back to the composer, or a failed reply. */
export type SendFailure =
  'allowance-reached' | 'spend-allowance-reached' | 'run-forbidden' | 'failed';

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

export type UseMessageHandlerProps = {
  onSendMessage: (message: string, mode: CreateSessionBodyReplyMode) => void;
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
  onSend: (message: string, mode: CreateSessionBodyReplyMode) => void;
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
  maxOutput: number;
};

export type ModelCatalogView = {
  options: ModelOption[];
  /** The Model a new chat starts on; absent while the catalog is empty. */
  defaultModel: string | undefined;
};

export type ContextLevel = 'normal' | 'warning' | 'critical';

export type ContextRingProps = {
  share: number;
  level: ContextLevel;
  size?: number;
  strokeWidth?: number;
};

export type ContextUsage = {
  /** The Model the numbers came from, which may differ from the composer's current pick. */
  model: ModelOption;
  used: number;
  /** The Model's context window minus the output it reserves for the reply. */
  budget: number;
  /** Used over budget, clamped to 1. */
  share: number;
  percent: number;
  level: ContextLevel;
  messagesIncluded: number;
  messagesTotal: number;
};

export type ModelPickerState = {
  isOpen: boolean;
  search: string;
  setOpen: (isOpen: boolean) => void;
  setSearch: (search: string) => void;
};

export type FavoriteModelsState = {
  favorites: string[];
  toggleFavorite: (modelId: string) => void;
};

export type ModelOptionRowProps = {
  model: ModelOption;
  // Keeps the row's cmdk value unique when the same Model is listed in two groups.
  valuePrefix: string;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (modelId: string) => void;
  onToggleFavorite: (modelId: string) => void;
};

export type ModelSelectProps = {
  selectedModel: string;
  onModelChange: (model: string) => void;
  /** The pick applies to no reply here (a Run's Agents choose their own Models). */
  disabled?: boolean;
};

export type ChatMessageListProps = {
  history: ChatMessage[];
  isStreaming: boolean;
  /** The newest reply was stopped by the User, so a note follows the thread. */
  isReplyStopped?: boolean;
  onRegenerate?: (prompt: string) => void;
  readOnly?: boolean;
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
  /** `stopped` is kept in the client only: the server persists no marker. */
  reply: ReplyState;
  usage: Usage;
  sessionId?: string;
  /** The reply stream being followed (or last followed): what the stop button cancels. */
  streamId: string | null;
  /** A Guest's send was refused because their message allowance is spent. */
  isMessageAllowanceReached: boolean;
  /** A verified user's send was refused because this month's spend allowance is used up. */
  isSpendAllowanceReached: boolean;
  /** The waiting Run the User just cancelled: the worker settles it after the cancel is accepted. */
  cancelledRunId: string | null;
  setHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  setUsage: (usage: Usage) => void;
  setSessionId: (id: string | undefined) => void;
  clearMessageAllowanceReached: () => void;
};

export type MessageState = {
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  /** A new chat's draft is to start a Run Session; a Session's own Reply mode wins once it exists. */
  isRunMode: boolean;
  toggleRunMode: () => void;
  resetRunMode: () => void;
};

/** The events a reply stream carries (`GET /api/streams/{streamId}`). */
export type SseEvent =
  | 'token'
  | 'usage'
  | 'error'
  | 'end'
  | 'step-started'
  | 'step-finished'
  | 'run-finished'
  | 'run-waiting';

/** One SSE event off a reply stream: its name, its raw `data` line and its stream entry id. */
export type SseFrame = {
  event: SseEvent;
  data: string;
  id?: string;
};
