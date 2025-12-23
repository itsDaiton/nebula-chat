import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const createConversationSchema = z.object({
  title: z.string().min(1),
});

export const getConversationSchema = z
  .object({
    conversationId: z.uuid(),
  })
  .openapi({ param: { name: 'conversationId', in: 'path' } });

export const conversationResponseSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    createdAt: z.iso.datetime(),
  })
  .openapi('Conversation');

export const conversationsArraySchema = z.array(conversationResponseSchema);

export const getConversationsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(20)
    .openapi({
      param: {
        name: 'limit',
        in: 'query',
        description: 'Number of conversations to fetch (1-100, default 20)',
      },
    }),
  cursor: z
    .uuid()
    .optional()
    .openapi({
      param: {
        name: 'cursor',
        in: 'query',
        description: 'Pagination cursor for fetching the next page of conversations',
      },
    }),
});

export const paginatedConversationsResponseSchema = z.object({
  conversations: conversationsArraySchema,
  nextCursor: z.uuid().nullable(),
  hasMore: z.boolean(),
});
