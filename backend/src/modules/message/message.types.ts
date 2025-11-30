import type z from 'zod';
import type { createMessageSchema, getMessagesSchema } from './message.validation';

export type CreateMessageDTO = z.infer<typeof createMessageSchema>;

export type GetMessageParams = z.infer<typeof getMessagesSchema>;
