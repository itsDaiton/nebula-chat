import type { Conversation, ConversationResponse } from '@/modules/conversations/types/types';

// The API serializes `createdAt` as an ISO string, but the OpenAPI document
// types it `unknown` (the server's Zod schema transforms a Date), so the
// generated client cannot narrow it.
export const toConversation = ({ id, title, createdAt }: ConversationResponse): Conversation => ({
  id,
  title,
  createdAt: String(createdAt),
});
