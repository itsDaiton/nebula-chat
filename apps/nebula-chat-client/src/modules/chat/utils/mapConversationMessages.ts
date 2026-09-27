import type { ListMessages200Item } from '@/libs/api/generated/model/listMessages200Item';
import type { ChatMessage } from '@/modules/chat/types/types';

const CHAT_ROLES: ReadonlySet<string> = new Set<ChatMessage['role']>([
  'user',
  'assistant',
  'system',
]);

const isChatRole = (role: string): role is ChatMessage['role'] => CHAT_ROLES.has(role);

/** Drops roles the chat view can't render; the API types `role` as a plain string. */
export const mapConversationMessages = (messages: ListMessages200Item[]): ChatMessage[] =>
  messages.flatMap(({ id, role, content }) => (isChatRole(role) ? [{ id, role, content }] : []));
