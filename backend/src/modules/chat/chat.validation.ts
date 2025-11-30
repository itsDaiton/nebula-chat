import { validModels } from '@backend/modules/chat/chat.utils';
import { z } from 'zod';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const createChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  model: z.string().refine((msg) => validModels.includes(msg), {
    message: 'Invalid model specified.',
  }),
});
