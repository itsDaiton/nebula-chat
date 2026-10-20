import type { EventLogger } from '@nebula-chat/otel';
import type { z } from 'zod';
import type { streamParamsSchema } from '@backend/modules/stream/stream.validation';

export type StreamParams = z.infer<typeof streamParamsSchema>;

/** What the relay logs through (`req.log`); structural, and `child` binds its component. */
export type StreamLogger = EventLogger & {
  child: (bindings: Record<string, unknown>, options?: { level: string }) => StreamLogger;
};
