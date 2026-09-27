import type { Conversation, ConversationResponse } from '@/modules/conversations/types/types';

// The spec types `createdAt` as `unknown` (a transformed Zod Date); it is an ISO string.
export const toConversation = ({ id, title, createdAt }: ConversationResponse): Conversation => ({
  id,
  title,
  createdAt: String(createdAt),
});
