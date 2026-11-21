import type { EventLogger } from '@nebula-chat/otel';
import type { z } from 'zod';
import type {
  messageAllowanceSchema,
  sendMessageParamsSchema,
  sendMessageSchema,
  sentMessageSchema,
  spendAllowanceSchema,
} from './chat.validation';

export type SendMessageParams = z.infer<typeof sendMessageParamsSchema>;

export type SendMessageDTO = z.infer<typeof sendMessageSchema>;

export type SentMessage = z.infer<typeof sentMessageSchema>;

/** What is left of the caller's Message allowance; `metered: false` for a verified Registered user. */
export type MessageAllowance = z.infer<typeof messageAllowanceSchema>;

/** What is left of the caller's Spend allowance; `capped: false` for a Metered user. */
export type SpendAllowance = z.infer<typeof spendAllowanceSchema>;

/** Who is sending: a Guest (`isAnonymous`) may not start a Run. */
export type ChatUser = { id: string; isAnonymous?: boolean | null | undefined };

/** What the send path logs through: the request's `req.log` in production. */
export type ChatLogger = EventLogger<'warn'>;
