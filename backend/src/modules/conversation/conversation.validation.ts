import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1),
});

export const getConversationSchema = z.object({
  conversationId: z.uuid(),
});
