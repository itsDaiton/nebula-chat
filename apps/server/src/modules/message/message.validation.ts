import { z } from 'zod';
import { isoDateTimeSchema } from '@backend/utils/isoDateTimeSchema';

export const createMessageSchema = z.object({
  sessionId: z.uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  tokenCount: z.number().int().nullable().optional(),
});

export const getMessagesSchema = z.object({
  messageId: z.uuid(),
});

export const listMessagesQuerySchema = z.object({
  sessionId: z.uuid().optional().describe('Only list the messages of this session, oldest first'),
});

export const messageResponseSchema = z
  .object({
    id: z.uuid(),
    sessionId: z.uuid(),
    content: z.string(),
    role: z.string(),
    tokenCount: z.number().int().nullable(),
    cached: z.boolean(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'Message' });

export const messagesArraySchema = z.array(messageResponseSchema).max(1000);
