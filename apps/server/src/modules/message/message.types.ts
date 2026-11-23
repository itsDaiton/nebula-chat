import type z from 'zod';
import type { messages } from '@nebula-chat/db';
import type {
  getMessagesSchema,
  listMessagesQuerySchema,
} from '@server/modules/message/message.validation';

export type CreateMessageDTO = {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  tokenCount?: number | null;
};

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
