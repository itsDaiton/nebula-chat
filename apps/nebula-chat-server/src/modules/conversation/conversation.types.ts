import type { z } from 'zod';
import type { createConversationSchema, getConversationSchema } from './conversation.validation';

export type CreateConversationDTO = z.infer<typeof createConversationSchema>;

export type GetConversationParams = z.infer<typeof getConversationSchema>;
