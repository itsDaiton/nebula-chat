import { z } from 'zod';
import { ownKeyRefsSchema } from './ownKeyRefs';

/** The BullMQ queue the server enqueues Direct replies on and the worker consumes. */
export const DIRECT_REPLY_QUEUE = 'direct-replies';

/**
 * A Direct reply job: IDs only (ADR-0013) plus the W3C trace context. The worker loads everything
 * else from Postgres, so the payload never carries Message content.
 */
export const directReplyJobSchema = z.object({
  /** The User who sent the Message and owns the Session. */
  userId: z.uuid(),
  sessionId: z.uuid(),
  /** The user Message this reply answers. */
  messageId: z.uuid(),
  /** The reply stream's key, and the id the assistant Message is persisted under. */
  streamId: z.uuid(),
  /** The stored Own key each provider's Model call uses; absent means the Operator key. */
  keyRefs: ownKeyRefsSchema.optional(),
  /** Bypasses the response cache and overwrites its entry. */
  regenerate: z.boolean().optional(),
  /** The server's W3C trace context; absent on a job enqueued outside a span. */
  traceparent: z.string().optional(),
  tracestate: z.string().optional(),
});

export type DirectReplyJob = z.infer<typeof directReplyJobSchema>;
