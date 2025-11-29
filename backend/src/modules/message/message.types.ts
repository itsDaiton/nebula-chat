import type z from 'zod';
import type { createMessageSchema } from './message.validation';

export type CreateMessageDTO = z.infer<typeof createMessageSchema>;
