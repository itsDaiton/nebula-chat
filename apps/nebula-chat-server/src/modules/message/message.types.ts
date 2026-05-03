import type z from 'zod';
import type { messages } from '@nebula-chat/db';
import type {
  createMessageSchema,
  getMessagesSchema,
} from '@backend/modules/message/message.validation';

export type CreateMessageDTO = z.infer<typeof createMessageSchema>;

export type GetMessageParams = z.infer<typeof getMessagesSchema>;

export type MessageRow = typeof messages.$inferSelect;

export type MessageHistoryRow = Pick<
  MessageRow,
  'id' | 'createdAt' | 'role' | 'content' | 'tokenCount'
>;
