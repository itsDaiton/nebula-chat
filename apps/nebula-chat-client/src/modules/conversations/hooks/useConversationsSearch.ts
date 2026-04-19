import type { Conversation } from '@/modules/conversations/types/types';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';

export const useConversationsSearch = (localConversations: Conversation[]) => {
  const { searchQuery, setSearchQuery, debouncedQuery, searchResults, isSearching, error } =
    useConversationsSearchStore();

  const isPending = searchQuery.trim() !== debouncedQuery.trim();
  const filteredConversations = searchQuery.trim() ? searchResults : localConversations;

  return {
    searchQuery,
    setSearchQuery,
    filteredConversations,
    isSearching: isPending || isSearching,
    error,
  };
};
