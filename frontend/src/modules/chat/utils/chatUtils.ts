import { createListCollection } from '@chakra-ui/react';
import type { ConversationWithMessages } from '@/modules/conversations/types/types';
import type { ChatMessage } from '@/modules/chat/types/types';

export const useIsUser = (role: string) => role === 'user';

export const mapConversationMessages = (
  messages: ConversationWithMessages['messages'],
): ChatMessage[] => messages.map(({ id, role, content }) => ({ id, role, content }));

export const modelOptions = createListCollection({
  items: [
    { label: 'GPT-4.1', value: 'gpt-4.1' },
    { label: 'GPT-4.1 mini', value: 'gpt-4.1-mini' },
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
    { label: 'GPT-5.1', value: 'gpt-5.1' },
    { label: 'GPT-5', value: 'gpt-5' },
    { label: 'GPT-5 mini', value: 'gpt-5-mini' },
  ],
});
