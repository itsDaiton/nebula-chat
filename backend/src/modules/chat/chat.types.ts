import type { z } from 'zod';
import type { createChatStreamSchema } from './chat.validation';

export type CreateChatStreamDTO = z.infer<typeof createChatStreamSchema>;

export interface UsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
