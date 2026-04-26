import { z } from 'zod';

export const createMessageSchema = z.object({
  conversationId: z.uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  tokenCount: z.number().int().nullable().optional(),
});

export const getMessagesSchema = z.object({
  messageId: z.uuid(),
});

export const messageResponseSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  content: z.string(),
  role: z.string(),
  tokenCount: z.number().int().nullable(),
  cached: z.boolean().nullable(),
  createdAt: z.iso.datetime(),
});

export const messagesArraySchema = z.array(messageResponseSchema);
