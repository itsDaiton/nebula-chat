import type { z } from 'zod';
import type { createChatStreamSchema } from './chat.validation';

export type CreateChatStreamDTO = z.infer<typeof createChatStreamSchema>;

export interface UsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamCallbacks {
  onConversationCreated: (conversationId: string) => void;
  onUserMessageCreated: (messageId: string) => void;
  onToken: (token: string) => void;
  onUsage: (usageData: UsageData) => void;
  onAssistantMessageCreated: (messageId: string) => void;
  onError: (error: string) => void;
}
