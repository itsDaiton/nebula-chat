import { useState, useMemo } from 'react';
import type { Conversation } from '../types/types';

export function useConversationsSearch(conversations: Conversation[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conv) => conv.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [conversations, searchQuery],
  );

  return {
    searchQuery,
    setSearchQuery,
    filteredConversations,
  };
}
