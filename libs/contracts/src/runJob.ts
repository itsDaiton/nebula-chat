import { z } from 'zod';

/** The BullMQ queue the server enqueues Runs on and the worker consumes. */
export const RUN_QUEUE = 'runs';

/** A Run job: IDs only (ADR-0013) plus the W3C trace context; the worker loads the rest from Postgres. */
export const runJobSchema = z.object({
  /** The Registered user who sent the Message and owns the Session. */
  userId: z.uuid(),
  sessionId: z.uuid(),
  /** The user Message that triggered the Run. */
  messageId: z.uuid(),
  /** The reply stream's key, and the id the assistant Message is persisted under. */
  streamId: z.uuid(),
  runId: z.uuid(),
  /** Present when the job resumes a Run waiting on a Clarifying question: `null` means nobody answered in time. */
  resume: z.object({ answerMessageId: z.uuid().nullable() }).optional(),
  /** The server's W3C trace context; absent on a job enqueued outside a span. */
  traceparent: z.string().optional(),
  tracestate: z.string().optional(),
});

export type RunJob = z.infer<typeof runJobSchema>;
