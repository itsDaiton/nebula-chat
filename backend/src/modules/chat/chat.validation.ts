import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { chatConfig } from './chat.config';
import { z } from 'zod';

extendZodWithOpenApi(z);

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const createChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  model: z.string().refine((msg) => chatConfig.validModels.includes(msg), {
    message: 'Invalid model specified.',
  }),
  conversationId: z.string().min(1).optional(),
});

export const chatStreamResponseSchema = z
  .object({
    event: z.string(),
    data: z.string(),
  })
  .openapi('Chat Stream');
