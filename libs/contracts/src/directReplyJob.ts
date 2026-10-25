import { z } from 'zod';

/** The BullMQ queue the server enqueues Direct replies on and the worker consumes. */
export const DIRECT_REPLY_QUEUE = 'direct-replies';

/**
 * A Direct reply job: IDs only (ADR-0013). The worker loads everything else from
 * Postgres, so the payload never carries Message content.
 */
export const directReplyJobSchema = z.object({
  /** The User who sent the Message and owns the Session. */
  userId: z.uuid(),
  sessionId: z.uuid(),
  /** The user Message this reply answers. */
  messageId: z.uuid(),
  /** The reply stream's key, and the id the assistant Message is persisted under. */
  streamId: z.uuid(),
  /** Bypasses the response cache and overwrites its entry. */
  regenerate: z.boolean().optional(),
});

export type DirectReplyJob = z.infer<typeof directReplyJobSchema>;
