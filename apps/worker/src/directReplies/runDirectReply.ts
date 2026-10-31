import { findModel } from '@nebula-chat/contracts';
import type { DirectReplyJob, ModelProvider, ReplyStreamEvent } from '@nebula-chat/contracts';
import {
  BadRequestError,
  MissingConfigurationError,
  NotFoundError,
  isAppError,
  toErrorEnvelope,
} from '@nebula-chat/errors';
import { componentLogger, logEvent, SpanKind, withSpan } from '@nebula-chat/otel';
import type { LogAttributes, Logger } from '@nebula-chat/otel';
import { readCachedReply, replyCacheKey, writeCachedReply } from '@worker/directReplies/replyCache';
import type { ReplyCache } from '@worker/directReplies/replyCache';
import type {
  ChatStreamCallbacks,
  ChatStreamConfig,
  HistoryMessage,
} from '@worker/directReplies/streamChat';
import type { Prompts } from '@worker/llm/prompts';
import { recordCachedModelCall, recordModelCall } from '@worker/modelCalls/recordModelCall';
import type { ModelCallLedger, ModelCallSubject } from '@worker/modelCalls/recordModelCall';

/** The most recent Messages loaded into a Direct reply's context. */
const MAX_HISTORY_MESSAGES = 20;

/** How often a streaming reply checks whether its User asked it to stop. */
const DEFAULT_CANCEL_POLL_MS = 250;

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
    /** Replayed from the response cache; omitted for a live reply. */
    cached?: boolean;
  }) => Promise<void>;
};

/** The reply stream the server relays: a Redis Stream in production. */
export type ReplyStreamWriter = {
  append: (streamId: string, event: ReplyStreamEvent) => Promise<void>;
  /** Gives a stream its TTL once it has its terminal event; Postgres holds the durable reply. */
  expire: (streamId: string) => Promise<void>;
  /** Whether the User asked to stop the reply (the server's cancel flag). */
  isCancelled: (streamId: string) => Promise<boolean>;
  /** Records that the stream has its terminal event, so the server stops naming it in flight. */
  markEnded: (streamId: string) => Promise<void>;
};

type EndEvent = Extract<ReplyStreamEvent, { type: 'end' }>;

/** Appends the terminal event: marked ended first, so a Session read after `end` never re-attaches. */
export const endStream = async (
  streamId: string,
  end: EndEvent,
  stream: ReplyStreamWriter,
): Promise<void> => {
  await stream.markEnded(streamId);
  await stream.append(streamId, end);
  await stream.expire(streamId);
};

export type StreamChat = (
  config: ChatStreamConfig,
  callbacks: ChatStreamCallbacks,
) => Promise<void>;

export type DirectReplyDeps = {
  store: DirectReplyStore;
  stream: ReplyStreamWriter;
  cache: ReplyCache;
  /** Where each model call, and each replay, is recorded. */
  ledger: ModelCallLedger;
  /** The model call: `directReplies/streamChat` in production. */
  streamChat: StreamChat;
  /** The system prompts, loaded once at boot. */
  prompts: Prompts;
  apiKeys: { [P in ModelProvider]?: string | undefined };
  logger: Logger;
  /** How often the model call checks for a cancel request. Default 250 ms. */
  cancelPollMs?: number;
};

/** Aborts `controller` once the reply's cancel flag is raised; call the returned function to stop watching. */
export const watchForCancel = (
  streamId: string,
  {
    stream,
    cancelPollMs = DEFAULT_CANCEL_POLL_MS,
  }: Pick<DirectReplyDeps, 'stream' | 'cancelPollMs'>,
  controller: AbortController,
): (() => void) => {
  let checking = false;
  const check = async (): Promise<void> => {
    checking = true;
    try {
      if (await stream.isCancelled(streamId)) controller.abort();
    } catch {
      // A failed check is not a cancel: the reply carries on, and the next check tries again.
    } finally {
      checking = false;
    }
  };
  const timer = setInterval(() => {
    if (!checking) void check();
  }, cancelPollMs);
  return () => clearInterval(timer);
};

/**
 * Streams one Direct reply, persists it under the stream's id, then ends the stream (after an
 * `error` on failure). A reply its User stops ends as `cancelled`, keeping what it had produced.
 */
export const runDirectReply = async (job: DirectReplyJob, deps: DirectReplyDeps): Promise<void> => {
  const { store, stream, logger } = deps;
  const startMs = Date.now();
  let model: string | undefined;
  let provider: ModelProvider | undefined;
  let usage: Usage | undefined;
  let contextMessages = 0;
  // What the model has produced so far: the whole reply, or what a cancelled one keeps.
  let reply = '';
  const tokens: string[] = [];
  const cancel = new AbortController();
  let stopWatching = (): void => undefined;
  // A stop that lands after the model returned is too late: the reply finishes, or fails, as is.
  let modelReturned = false;

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

    const catalogModel = findModel(model);
    if (!catalogModel) throw new BadRequestError(`Unsupported model: ${model}`);
    provider = catalogModel.provider;
    const subject: ModelCallSubject = {
      idempotencyKey: job.streamId,
      userId: job.userId,
      sessionId: job.sessionId,
      provider,
      model,
    };
    // A reply stopped while its job waited in the queue never reaches the model.
    if (await stream.isCancelled(job.streamId)) {
      cancel.abort();
      await endCancelled(job, reply, deps, summary);
      return;
    }

    const cacheKey = replyCacheKey(job.sessionId, model, userMessage.content);
    // Regenerate skips the lookup; its capture below then overwrites the entry (ADR-0009).
    const hit = job.regenerate ? null : await readCachedReply(deps.cache, cacheKey, logger);
    if (hit) {
      for (const token of hit.tokens) enqueue({ type: 'token', token });
      if (hit.usage) enqueue({ type: 'usage', ...hit.usage });
      await appended;
      await store.createAssistantMessage({
        id: job.streamId,
        sessionId: job.sessionId,
        content: hit.tokens.join(''),
        tokenCount: hit.usage?.totalTokens ?? null,
        cached: true,
      });
      await recordCachedModelCall(deps.ledger, logger, subject, startMs, {
        messageId: job.streamId,
        contextMessages: history.length,
      });
      await endStream(job.streamId, { type: 'end' }, stream);
      logEvent(
        componentLogger(logger, 'chat'),
        'info',
        'chat.reply.completed',
        {
          'gen_ai.request.model': model,
          'gen_ai.usage.input_tokens': hit.usage?.promptTokens,
          'gen_ai.usage.output_tokens': hit.usage?.completionTokens,
          'nebula.duration_ms': Date.now() - startMs,
          'nebula.outcome': 'completed',
          'nebula.cache.key': cacheKey,
        },
        `Direct reply replayed from the cache · ${model} · ${hit.usage?.totalTokens ?? 0} tokens`,
      );
      return;
    }

    // A replay makes no model call, so only a live reply needs the provider's key.
    const apiKey = deps.apiKeys[provider];
    if (!apiKey) {
      throw new MissingConfigurationError(
        provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY',
      );
    }

    stopWatching = watchForCancel(job.streamId, deps, cancel);
    const modelProvider = provider;
    const modelName = model;
    await withSpan(
      `chat ${modelName}`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'gen_ai.operation.name': 'chat',
          'gen_ai.provider.name': modelProvider,
          'gen_ai.request.model': modelName,
        },
      },
      () =>
        recordModelCall(
          deps.ledger,
          logger,
          subject,
          (onCallUsage) =>
            deps.streamChat(
              {
                provider: modelProvider,
                apiKey,
                model: modelName,
                systemPrompt: deps.prompts.directReply,
                history,
                userMessage: userMessage.content,
                logger: componentLogger(logger, 'llm'),
                signal: cancel.signal,
              },
              {
                onToken: (token) => {
                  reply += token;
                  tokens.push(token);
                  enqueue({ type: 'token', token });
                },
                onUsage: (u) => {
                  usage = u;
                  enqueue({ type: 'usage', ...u });
                },
                onCallUsage,
                onContext: (count) => {
                  contextMessages = count;
                },
              },
            ),
          cancel.signal,
          async () => {
            modelReturned = true;
            stopWatching();
            await appended;
            if (!reply.trim()) throw new Error('The assistant did not generate a response.');
            await store.createAssistantMessage({
              id: job.streamId,
              sessionId: job.sessionId,
              content: reply,
              tokenCount: usage?.totalTokens ?? null,
            });
            return { messageId: job.streamId, contextMessages };
          },
        ),
    );
    await endStream(job.streamId, { type: 'end' }, stream);
    await writeCachedReply(deps.cache, cacheKey, { tokens, ...(usage && { usage }) }, logger);

    logEvent(
      componentLogger(logger, 'chat'),
      'info',
      'chat.reply.completed',
      { ...summary(), 'nebula.outcome': 'completed' },
      `Direct reply completed · ${model} · ${usage?.totalTokens ?? 0} tokens · ${((Date.now() - startMs) / 1000).toFixed(1)} s`,
    );
  } catch (error) {
    stopWatching();
    if (cancel.signal.aborted && !modelReturned) {
      await appended.catch(() => undefined);
      await endCancelled(job, reply, deps, summary);
      return;
    }
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

/** Persists what a stopped reply had produced, if anything, then ends its stream as `cancelled`. */
const endCancelled = async (
  job: DirectReplyJob,
  content: string,
  deps: DirectReplyDeps,
  summary: () => LogAttributes,
): Promise<void> => {
  const { store, stream, logger } = deps;
  try {
    if (content.trim()) {
      // Usage only arrives once a model call completes, so a stopped reply has no token count.
      await store.createAssistantMessage({
        id: job.streamId,
        sessionId: job.sessionId,
        content,
        tokenCount: null,
      });
    }
    await endStream(job.streamId, { type: 'end', reason: 'cancelled' }, stream);
    logEvent(
      componentLogger(logger, 'chat'),
      'info',
      'chat.reply.completed',
      { ...summary(), 'nebula.outcome': 'cancelled' },
      'Direct reply cancelled by its User',
    );
  } catch (error) {
    const envelope = toErrorEnvelope(error);
    logEvent(
      componentLogger(logger, 'chat'),
      'error',
      'chat.reply.completed',
      { ...summary(), 'nebula.outcome': 'failed', 'error.type': envelope.error, err: error },
      `Cancelled Direct reply failed to finish · ${envelope.error}`,
    );
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
    await endStream(streamId, { type: 'end' }, stream);
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
