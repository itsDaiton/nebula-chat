import type { ConversationWithMessages } from '@/modules/conversations/types/types';
import type { ChatMessage } from '@/modules/chat/types/types';

export const mapConversationMessages = (
  messages: ConversationWithMessages['messages'],
): ChatMessage[] => messages.map(({ id, role, content }) => ({ id, role, content }));
