import { z } from 'zod';
import { MODEL_REGISTRY } from '@nebula-chat/langchain';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const createChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).length(1),
  model: z
    .string()
    .refine((m) => Object.hasOwn(MODEL_REGISTRY, m), { message: 'Invalid model name' }),
  conversationId: z.uuid().optional(),
  regenerate: z
    .boolean()
    .optional()
    .default(false)
    .describe('Bypass and overwrite any cached response, forcing a fresh completion'),
});

export const chatStreamResponseSchema = z.object({
  event: z.string(),
  data: z.string(),
});
