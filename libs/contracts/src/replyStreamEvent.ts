import { z } from 'zod';
import { errorEnvelopeSchema } from '@nebula-chat/errors';

const tokenEventSchema = z.object({ type: z.literal('token'), token: z.string() });

const usageEventSchema = z.object({
  type: z.literal('usage'),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

// The same envelope the JSON error handler sends (ADR-0011), so a client reads errors one way.
const errorEventSchema = errorEnvelopeSchema.extend({ type: z.literal('error') });

// `reason` is absent for a reply that ran to its end or failed, and `cancelled` for one the User
// stopped: whatever it had produced by then is the persisted reply.
const endEventSchema = z.object({
  type: z.literal('end'),
  reason: z.enum(['cancelled']).optional(),
});

// A Step of a Run starting. `attempt` is 1 the first time; a higher one for a Step already shown means it
// re-ran on resume, so the client discards what it rendered for it (ADR-0033 §5).
const stepStartedEventSchema = z.object({
  type: z.literal('step-started'),
  stepId: z.uuid(),
  attempt: z.number().int().positive(),
  phase: z.enum(['intake', 'orchestrator', 'delegate', 'tool', 'output']),
  agent: z.string().min(1),
  /** A short label for the UI; the Step's input and output stay in Postgres. */
  label: z.string().min(1),
  // The Orchestrator turn the Step belongs to (0 outside the loop); a delegate's parent is its turn's Step.
  turn: z.number().int().nonnegative(),
  parentStepId: z.uuid().nullable(),
});

const stepFinishedEventSchema = z.object({
  type: z.literal('step-finished'),
  stepId: z.uuid(),
  status: z.enum(['completed', 'failed']),
});

// The Run's end state, sent just before `end`; a failed Run carries what failed.
const runFinishedEventSchema = z.object({
  type: z.literal('run-finished'),
  runId: z.uuid(),
  status: z.enum(['completed', 'partial', 'failed', 'cancelled']),
  error: errorEnvelopeSchema.optional(),
});

// The Run paused on a Clarifying question; the stream ends right after, and the answer's reply is a new stream.
const runWaitingEventSchema = z.object({
  type: z.literal('run-waiting'),
  runId: z.uuid(),
  questionMessageId: z.uuid(),
  question: z.string().min(1),
});

// One reply stream entry (ADR-0014), relayed as an SSE event named `type` with the rest as data.
// A stream always finishes with `end`, after an `error` too.
export const replyStreamEventSchema = z.discriminatedUnion('type', [
  tokenEventSchema,
  usageEventSchema,
  errorEventSchema,
  endEventSchema,
  stepStartedEventSchema,
  stepFinishedEventSchema,
  runFinishedEventSchema,
  runWaitingEventSchema,
]);

export type ReplyStreamEvent = z.infer<typeof replyStreamEventSchema>;

export type ReplyStreamEventType = ReplyStreamEvent['type'];

/** The string stored in a stream entry. */
export const serializeReplyStreamEvent = (event: ReplyStreamEvent): string =>
  JSON.stringify(replyStreamEventSchema.parse(event));

/** The event a stream entry holds, or `null` when it is not valid JSON or not an event. */
export const parseReplyStreamEvent = (raw: string): ReplyStreamEvent | null => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = replyStreamEventSchema.safeParse(value);
  return result.success ? result.data : null;
};
