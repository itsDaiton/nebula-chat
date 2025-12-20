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
