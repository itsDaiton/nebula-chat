import { estimateCost } from '@nebula-chat/contracts';
import type { ModelProvider } from '@nebula-chat/contracts';
import type { ModelCallOutcome } from '@nebula-chat/db';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';

/** What a call used: `inputTokens` are those billed at the full rate, the cached ones are counted apart. */
export type CallUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  /** Our own count, because the provider reported none. */
  estimated: boolean;
};

/** Who and what a call was for; a Step later passes its own `runId`, `stepId` and `agent`. */
export type ModelCallSubject = {
  /** Names the call across retries: a Direct reply's stream id, a Step's id. */
  idempotencyKey: string;
  userId: string;
  sessionId: string;
  runId?: string;
  stepId?: string;
  agent?: string;
  provider: ModelProvider;
  model: string;
};

/** What links a Direct reply's call to the assistant Message it produced. */
export type ModelCallLink = { messageId: string; contextMessages: number };

export type ModelCall = ModelCallSubject &
  Partial<ModelCallLink> & {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    tokensEstimated: boolean;
    costUsd: number;
    durationMs: number;
    outcome: ModelCallOutcome;
    cached: boolean;
  };

/** The append-only Model call ledger: Postgres in production. It keeps the first call recorded under a key. */
export type ModelCallLedger = {
  append: (call: ModelCall) => Promise<void>;
};

const NO_USAGE: CallUsage = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  estimated: false,
};

// The one writer of the ledger. The cost is priced now and stored, so a later price change leaves history alone.
// A failed write is logged, never thrown: the reply is already made and a lost row must not unmake it.
const append = async (
  ledger: ModelCallLedger,
  logger: Logger,
  subject: ModelCallSubject,
  call: {
    usage: CallUsage;
    durationMs: number;
    outcome: ModelCallOutcome;
    cached: boolean;
    link?: ModelCallLink | undefined;
  },
): Promise<void> => {
  const { usage, link, ...rest } = call;
  try {
    await ledger.append({
      ...subject,
      ...link,
      inputTokens: usage.inputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      outputTokens: usage.outputTokens,
      tokensEstimated: usage.estimated,
      costUsd: estimateCost(subject.model, usage),
      ...rest,
    });
  } catch (err) {
    logEvent(
      componentLogger(logger, 'chat'),
      'warn',
      'model_call.record.failed',
      { err, 'gen_ai.request.model': subject.model, 'nebula.outcome': call.outcome },
      'Model call could not be recorded; continuing without it',
    );
  }
};

/** Runs `call` and records it once: `completed` if it returns, else `cancelled` when `signal` aborted, `failed` if not. */
// `persist` runs before the row is written so it can link the Message; if it throws the call is still recorded, unlinked.
export const recordModelCall = async <T>(
  ledger: ModelCallLedger,
  logger: Logger,
  subject: ModelCallSubject,
  call: (reportUsage: (usage: CallUsage) => void) => Promise<T>,
  signal?: AbortSignal,
  persist?: () => Promise<ModelCallLink>,
): Promise<T> => {
  const startMs = Date.now();
  let usage = NO_USAGE;
  const record = (outcome: ModelCallOutcome, link?: ModelCallLink): Promise<void> =>
    append(ledger, logger, subject, {
      usage,
      durationMs: Date.now() - startMs,
      outcome,
      cached: false,
      link,
    });
  let result: T;
  try {
    result = await call((reported) => {
      usage = reported;
    });
  } catch (error) {
    await record(signal?.aborted ? 'cancelled' : 'failed');
    throw error;
  }
  let link: ModelCallLink | undefined;
  try {
    link = await persist?.();
  } catch (error) {
    await record('completed');
    throw error;
  }
  await record('completed', link);
  return result;
};

/** Records a replayed Cache entry: it called no provider, so it costs nothing. */
export const recordCachedModelCall = (
  ledger: ModelCallLedger,
  logger: Logger,
  subject: ModelCallSubject,
  startMs: number,
  link: ModelCallLink,
): Promise<void> =>
  append(ledger, logger, subject, {
    usage: NO_USAGE,
    durationMs: Date.now() - startMs,
    outcome: 'completed',
    cached: true,
    link,
  });
