import { z } from 'zod';
import { chatConfig } from '@backend/modules/chat/chat.config';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const createChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  model: z.string().refine((msg) => chatConfig.validModels.includes(msg), {
    message: 'Invalid model specified.',
  }),
  conversationId: z.uuid().optional(),
});

export const chatStreamResponseSchema = z.object({
  event: z.string(),
  data: z.string(),
});
