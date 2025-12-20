import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const createMessageSchema = z.object({
  conversationId: z.uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  tokens: z.number().optional(),
});

export const getMessagesSchema = z
  .object({
    messageId: z.uuid(),
  })
  .openapi({
    param: { name: 'messageId', in: 'path' },
  });

export const messageResponseSchema = z
  .object({
    id: z.uuid(),
    conversationId: z.uuid(),
    content: z.string(),
    role: z.string(),
    tokens: z.number().nullable(),
    createdAt: z.iso.datetime(),
  })
  .openapi('Message');

export const messagesArraySchema = z.array(messageResponseSchema);
