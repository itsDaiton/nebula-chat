import type { DirectReplyJob, ReplyStreamEvent } from '@nebula-chat/contracts';
import {
  BadRequestError,
  MissingConfigurationError,
  NotFoundError,
  isAppError,
  toErrorEnvelope,
} from '@nebula-chat/errors';
import { getProviderForModel } from '@nebula-chat/langchain';
import type {
  ChatStreamCallbacks,
  ChatStreamConfig,
  HistoryMessage,
  ProviderType,
} from '@nebula-chat/langchain';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { LogAttributes, Logger } from '@nebula-chat/otel';
import { DIRECT_REPLY_SYSTEM_PROMPT } from '@worker/directReplies/systemPrompt';

/** The most recent Messages loaded into a Direct reply's context. */
const MAX_HISTORY_MESSAGES = 20;

type Usage = Omit<Extract<ReplyStreamEvent, { type: 'usage' }>, 'type'>;

export type StoredSession = { id: string; model: string };

export type StoredMessage = { id: string; role: HistoryMessage['role']; content: string };

/** Where a Direct reply reads its Session and history and persists its answer: Postgres in production. */
export type DirectReplyStore = {
  /** The Session, only when `userId` owns it. */
  findSession: (sessionId: string, userId: string) => Promise<StoredSession | null>;
  /** The Session's latest Messages, newest first. */
  findRecentMessages: (sessionId: string, limit: number) => Promise<StoredMessage[]>;
  createAssistantMessage: (message: {
    id: string;
    sessionId: string;
    content: string;
    tokenCount: number | null;
  }) => Promise<void>;
};

/** The reply stream the server relays: a Redis Stream in production. */
export type ReplyStreamWriter = {
  append: (streamId: string, event: ReplyStreamEvent) => Promise<void>;
  /** Gives a finished stream its TTL; Postgres holds the durable reply. */
  expire: (streamId: string) => Promise<void>;
};

export type StreamChat = (
  config: ChatStreamConfig,
  callbacks: ChatStreamCallbacks,
) => Promise<void>;

export type DirectReplyDeps = {
  store: DirectReplyStore;
  stream: ReplyStreamWriter;
  /** The model call: `@nebula-chat/langchain`'s `streamChat` in production. */
  streamChat: StreamChat;
  apiKeys: { [P in ProviderType]?: string | undefined };
  logger: Logger;
};

/** Streams one Direct reply, persists it under the stream's id, then ends the stream (after an `error` on failure). */
export const runDirectReply = async (job: DirectReplyJob, deps: DirectReplyDeps): Promise<void> => {
  const { store, stream, logger } = deps;
  const startMs = Date.now();
  let model: string | undefined;
  let provider: ProviderType | undefined;
  let usage: Usage | undefined;

  const summary = (): LogAttributes => ({
    'gen_ai.provider.name': provider,
    'gen_ai.request.model': model,
    'gen_ai.usage.input_tokens': usage?.promptTokens,
    'gen_ai.usage.output_tokens': usage?.completionTokens,
    'nebula.duration_ms': Date.now() - startMs,
  });

  // Tokens arrive through a synchronous callback; chaining the appends keeps them in order.
  let appended: Promise<void> = Promise.resolve();
  const enqueue = (event: ReplyStreamEvent): void => {
    appended = appended.then(() => stream.append(job.streamId, event));
  };

  try {
    const session = await store.findSession(job.sessionId, job.userId);
    if (!session) throw new NotFoundError('Session', job.sessionId);
    model = session.model;

    const recent = await store.findRecentMessages(job.sessionId, MAX_HISTORY_MESSAGES);
    const userMessage = recent.find((m) => m.id === job.messageId);
    if (!userMessage) throw new NotFoundError('Message', job.messageId);
    const history = recent
      .filter((m) => m.id !== job.messageId)
      .toReversed()
      .map(({ role, content }) => ({ role, content }));

    try {
      provider = getProviderForModel(model);
    } catch {
      throw new BadRequestError(`Unsupported model: ${model}`);
    }
    const apiKey = deps.apiKeys[provider];
    if (!apiKey) {
      throw new MissingConfigurationError(
        provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY',
      );
    }

    let content = '';
    await deps.streamChat(
      {
        provider,
        apiKey,
        model,
        systemPrompt: DIRECT_REPLY_SYSTEM_PROMPT,
        history,
        userMessage: userMessage.content,
        logger: componentLogger(logger, 'llm'),
      },
      {
        onToken: (token) => {
          content += token;
          enqueue({ type: 'token', token });
        },
        onUsage: (u) => {
          usage = u;
          enqueue({ type: 'usage', ...u });
        },
      },
    );
    await appended;

    if (!content.trim()) throw new Error('The assistant did not generate a response.');

    await store.createAssistantMessage({
      id: job.streamId,
      sessionId: job.sessionId,
      content,
      tokenCount: usage?.totalTokens ?? null,
    });
    await stream.append(job.streamId, { type: 'end' });
    await stream.expire(job.streamId);

    logEvent(
      componentLogger(logger, 'chat'),
      'info',
      'chat.reply.completed',
      { ...summary(), 'nebula.outcome': 'completed' },
      `Direct reply completed · ${model} · ${usage?.totalTokens ?? 0} tokens · ${((Date.now() - startMs) / 1000).toFixed(1)} s`,
    );
  } catch (error) {
    // The one handler for a failed reply: an AppError speaks for itself, anything else is generic.
    const envelope = toErrorEnvelope(error);
    const callerCaused = isAppError(error) && error.status < 500;
    logEvent(
      componentLogger(logger, 'chat'),
      callerCaused ? 'warn' : 'error',
      'chat.reply.completed',
      { ...summary(), 'nebula.outcome': 'failed', 'error.type': envelope.error, err: error },
      `Direct reply failed · ${envelope.error}`,
    );
    // Tokens still queued go out first, or `end` would overtake them and the relay would drop them.
    await appended.catch(() => undefined);
    await endWithError(job.streamId, envelope, deps);
  }
};

const endWithError = async (
  streamId: string,
  envelope: ReturnType<typeof toErrorEnvelope>,
  { stream, logger }: DirectReplyDeps,
): Promise<void> => {
  try {
    await stream.append(streamId, { type: 'error', ...envelope });
    await stream.append(streamId, { type: 'end' });
    await stream.expire(streamId);
  } catch (err) {
    // The reply's own failure is already logged; this is the stream it could not be told on.
    logEvent(
      componentLogger(logger, 'redis'),
      'warn',
      'chat.stream.end.failed',
      { err },
      'Could not end the reply stream after a failed reply',
    );
  }
};
