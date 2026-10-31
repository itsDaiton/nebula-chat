import type { ReplyStreamEvent } from '@nebula-chat/contracts';
import type { ReplyCache } from '@worker/directReplies/replyCache';
import type { CallUsage, ModelCall, ModelCallLedger } from '@worker/modelCalls/recordModelCall';
import type {
  DirectReplyStore,
  ReplyStreamWriter,
  StoredMessage,
  StoredSession,
  StreamChat,
} from '@worker/directReplies/runDirectReply';

type StoredAssistantMessage = Parameters<DirectReplyStore['createAssistantMessage']>[0];

/** Postgres in memory: Sessions keyed by id with their owner, Messages oldest first. */
export const memoryStore = () => {
  const sessions = new Map<string, StoredSession & { userId: string }>();
  const messages: (StoredMessage & { sessionId: string })[] = [];
  const created: StoredAssistantMessage[] = [];
  const store: DirectReplyStore = {
    findSession: async (sessionId, userId) => {
      const session = sessions.get(sessionId);
      return session?.userId === userId ? { id: session.id, model: session.model } : null;
    },
    findRecentMessages: async (sessionId, limit) =>
      messages
        .filter((m) => m.sessionId === sessionId)
        .toReversed()
        .slice(0, limit)
        .map(({ id, role, content }) => ({ id, role, content })),
    createAssistantMessage: async (message) => {
      created.push(message);
    },
  };
  return { store, sessions, messages, created };
};

/** Reply streams in memory, with every write in one ordered log so tests can assert sequencing. */
export const memoryStream = (operations: string[] = []) => {
  const events = new Map<string, ReplyStreamEvent[]>();
  const expired = new Set<string>();
  // The streams a User asked to stop: the server raises this flag, the worker reads it.
  const cancelled = new Set<string>();
  const ended = new Set<string>();
  const stream: ReplyStreamWriter = {
    append: async (streamId, event) => {
      events.set(streamId, [...(events.get(streamId) ?? []), event]);
      operations.push(`append:${event.type}`);
    },
    expire: async (streamId) => {
      expired.add(streamId);
      operations.push('expire');
    },
    isCancelled: async (streamId) => cancelled.has(streamId),
    markEnded: async (streamId) => {
      ended.add(streamId);
      operations.push('markEnded');
    },
  };
  return { stream, events, expired, cancelled, ended };
};

/** A model that streams `tokens`, then reports `usage` and, when given, what the provider billed. */
export const scriptedModel = (
  tokens: string[],
  usage = { promptTokens: 10, completionTokens: tokens.length, totalTokens: 10 + tokens.length },
  callUsage?: CallUsage,
) => {
  const calls: Parameters<StreamChat>[0][] = [];
  const streamChat: StreamChat = async (config, { onToken, onUsage, onCallUsage, onContext }) => {
    calls.push(config);
    onContext?.(config.history.length);
    for (const token of tokens) onToken(token);
    onUsage(usage);
    if (callUsage) onCallUsage?.(callUsage);
  };
  return { streamChat, calls };
};

/** A model that streams `tokens` and then fails with `error`, as a provider outage mid-reply would. */
export const failingModel =
  (error: Error, tokens: string[] = [], callUsage?: CallUsage): StreamChat =>
  async (_config, { onToken, onCallUsage }) => {
    for (const token of tokens) onToken(token);
    if (callUsage) onCallUsage?.(callUsage);
    throw error;
  };

/**
 * A model that streams one token every few milliseconds until it runs out or its `signal`
 * aborts, then rejects as a LangChain call does. `onToken` runs after each token reaches the reply.
 */
export const slowModel = (
  tokens: string[],
  onToken: (index: number) => void = () => undefined,
  callUsage?: CallUsage,
) => {
  const signals: (AbortSignal | undefined)[] = [];
  const streamChat: StreamChat = async ({ signal }, callbacks) => {
    signals.push(signal);
    try {
      for (const [index, token] of tokens.entries()) {
        signal?.throwIfAborted();
        callbacks.onToken(token);
        onToken(index);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      signal?.throwIfAborted();
      callbacks.onUsage({
        promptTokens: 10,
        completionTokens: tokens.length,
        totalTokens: 10 + tokens.length,
      });
    } finally {
      // As `streamChat` does: a stopped or failed call still reports what the provider billed.
      if (callUsage) callbacks.onCallUsage?.(callUsage);
    }
  };
  return { streamChat, signals };
};

/** The response cache in memory, with every write recorded so tests can assert on capture. */
export const memoryCache = () => {
  const entries = new Map<string, unknown>();
  const writes: string[] = [];
  const cache: ReplyCache = {
    get: async (key) => entries.get(key) ?? null,
    set: async (key, entry) => {
      entries.set(key, entry);
      writes.push(key);
    },
  };
  return { cache, entries, writes };
};

/** A cache whose Redis is down: every read and write rejects. */
export const brokenCache = (): ReplyCache => ({
  get: async () => {
    throw new Error('redis down');
  },
  set: async () => {
    throw new Error('redis down');
  },
});

/** The Model call ledger in memory; like the table, it keeps the first call recorded under a key. */
export const memoryLedger = () => {
  const calls: ModelCall[] = [];
  const ledger: ModelCallLedger = {
    append: async (call) => {
      if (!calls.some((c) => c.idempotencyKey === call.idempotencyKey)) calls.push(call);
    },
  };
  return { ledger, calls };
};

/** A ledger whose Postgres is down: every append rejects. */
export const brokenLedger = (): ModelCallLedger => ({
  append: async () => {
    throw new Error('postgres down');
  },
});
