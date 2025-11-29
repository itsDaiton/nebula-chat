import z from 'zod';

export const createMessageSchema = z.object({
  conversationId: z.uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  tokens: z.number().optional(),
});
