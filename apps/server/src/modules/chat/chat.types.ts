import type { EventLogger } from '@nebula-chat/otel';
import type { z } from 'zod';
import type {
  messageAllowanceSchema,
  sendMessageParamsSchema,
  sendMessageSchema,
  sentMessageSchema,
} from './chat.validation';

export type SendMessageParams = z.infer<typeof sendMessageParamsSchema>;

export type SendMessageDTO = z.infer<typeof sendMessageSchema>;

export type SentMessage = z.infer<typeof sentMessageSchema>;

/** What is left of the caller's Message allowance; `metered: false` for a verified Registered user. */
export type MessageAllowance = z.infer<typeof messageAllowanceSchema>;

/** What the send path logs through: the request's `req.log` in production. */
export type ChatLogger = EventLogger<'warn'>;
