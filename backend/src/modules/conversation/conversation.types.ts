import type z from 'zod';
import type { createConversationSchema } from './conversation.validation';

export type CreateConversationDTO = z.infer<typeof createConversationSchema>;
