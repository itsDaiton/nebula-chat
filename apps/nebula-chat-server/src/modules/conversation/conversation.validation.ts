import { z } from 'zod';
import { paginationConfig } from '@backend/config/pagination.config';
import { isoDateTimeSchema } from '@backend/utils/isoDateTimeSchema';

export const createConversationSchema = z.object({
  title: z.string().min(1),
});

export const getConversationSchema = z.object({
  conversationId: z.uuid(),
});

export const conversationResponseSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'Conversation' });

export const conversationsArraySchema = z.array(conversationResponseSchema).max(100);

export const searchConversationsQuerySchema = z.object({
  q: z.string().min(1).describe('Search query to filter conversations by title'),
});

export const getConversationsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(paginationConfig.maxLimit)
    .optional()
    .default(paginationConfig.defaultLimit)
    .describe(
      `Number of conversations to fetch (1-${String(paginationConfig.maxLimit)}, default ${String(paginationConfig.defaultLimit)})`,
    ),
  cursor: z
    .uuid()
    .optional()
    .describe('Pagination cursor for fetching the next page of conversations'),
});

export const paginatedConversationsResponseSchema = z
  .object({
    conversations: conversationsArraySchema,
    nextCursor: z.uuid().nullable(),
    hasMore: z.boolean(),
  })
  .meta({ id: 'ConversationPage' });
