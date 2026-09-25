import type { EventLogger } from '@nebula-chat/otel';
import type { z } from 'zod';
import type { createChatStreamSchema } from './chat.validation';

export type CreateChatStreamDTO = z.infer<typeof createChatStreamSchema>;

export type UsageData = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

/**
 * What the chat service logs through: in production the request's `req.log`,
 * already bound to the request id and the User. Structural rather than Fastify's
 * logger type so the service stays free of the HTTP layer; it needs `child` to
 * bind the Session and the component, and passes a child on to the LLM call.
 */
export type ChatLogger = EventLogger & {
  child: (bindings: Record<string, unknown>, options?: { level: string }) => ChatLogger;
};
