import type { EventLogger } from '@nebula-chat/otel';
import type { z } from 'zod';
import type { streamParamsSchema } from './stream.validation';

export type StreamParams = z.infer<typeof streamParamsSchema>;

/**
 * What the relay logs through: the request's `req.log` in production. Structural
 * rather than Fastify's logger type; it needs `child` to bind its component.
 */
export type StreamLogger = EventLogger & {
  child: (bindings: Record<string, unknown>, options?: { level: string }) => StreamLogger;
};
