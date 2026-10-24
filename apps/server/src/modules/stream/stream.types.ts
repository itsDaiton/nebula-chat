import type { EventLogger } from '@nebula-chat/otel';
import type { z } from 'zod';
import type {
  replyStreamHeadersSchema,
  replyStreamQuerySchema,
  streamParamsSchema,
} from '@backend/modules/stream/stream.validation';

export type StreamParams = z.infer<typeof streamParamsSchema>;

export type ReplyStreamQuery = z.infer<typeof replyStreamQuerySchema>;

export type ReplyStreamHeaders = z.infer<typeof replyStreamHeadersSchema>;

/** What the relay logs through (`req.log`); structural, and `child` binds its component. */
export type StreamLogger = EventLogger & {
  child: (bindings: Record<string, unknown>, options?: { level: string }) => StreamLogger;
};
