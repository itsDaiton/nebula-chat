import { z } from 'zod';
import { isoDateTimeSchema } from '@server/utils/isoDateTimeSchema';

export const createMessageSchema = z.object({
  sessionId: z.uuid(),
  role: z.enum(['user', 'assistant']),
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
    model: z
      .string()
      .nullable()
      .describe('The Model that wrote a Direct reply; null for a Run answer'),
    estimatedCostUsd: z
      .number()
      .nullable()
      .describe('Estimated cost in USD; for a Run answer, the sum of the Run’s Model calls'),
    runId: z.uuid().nullable().describe('The Run that produced this Message'),
    contextTokens: z.number().int().nullable().describe('Input tokens of a Direct reply’s request'),
    contextMessages: z
      .number()
      .int()
      .nullable()
      .describe('History Messages sent with a Direct reply'),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'Message' });

export const messagesArraySchema = z.array(messageResponseSchema).max(1000);
