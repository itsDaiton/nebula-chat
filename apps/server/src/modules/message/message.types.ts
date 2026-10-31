import type z from 'zod';
import type { messages } from '@nebula-chat/db';
import type {
  createMessageSchema,
  getMessagesSchema,
  listMessagesQuerySchema,
} from '@server/modules/message/message.validation';

export type CreateMessageDTO = z.infer<typeof createMessageSchema>;

export type GetMessageParams = z.infer<typeof getMessagesSchema>;

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

export type MessageRow = typeof messages.$inferSelect;

export type MessageHistoryRow = Pick<
  MessageRow,
  'id' | 'createdAt' | 'role' | 'content' | 'tokenCount'
>;

export type MessageMeta = {
  model: string | null;
  estimatedCostUsd: number | null;
  contextTokens: number | null;
  contextMessages: number | null;
};

export type MessageWithMetaRow = MessageRow & MessageMeta;
