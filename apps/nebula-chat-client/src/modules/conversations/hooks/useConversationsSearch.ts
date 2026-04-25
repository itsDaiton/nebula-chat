import type { Conversation } from '@/modules/conversations/types/types';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';

type UseConversationsSearchParams = {
  localConversations: Conversation[];
  onClose: () => void;
  onConversationClick: (conversationId: string) => void;
};

export const useConversationsSearch = ({
  localConversations,
  onClose,
  onConversationClick,
}: UseConversationsSearchParams) => {
  const {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    searchResults,
    isSearching,
    error,
    clearResults,
  } = useConversationsSearchStore();

  const trimmedSearchQuery = searchQuery.trim();
  const trimmedDebouncedQuery = debouncedQuery.trim();
  const isPending = trimmedSearchQuery !== trimmedDebouncedQuery;
  const hasSettledSearchQuery = Boolean(trimmedSearchQuery) && !isPending;
  const filteredConversations = hasSettledSearchQuery ? searchResults : localConversations;

  const closeAndClearResults = () => {
    setSearchQuery('');
    clearResults();
    onClose();
  };

  const selectConversationAndClearResults = (conversationId: string) => {
    setSearchQuery('');
    clearResults();
    onConversationClick(conversationId);
  };

  return {
    searchQuery,
    setSearchQuery,
    filteredConversations,
    isSearching: isPending || isSearching,
    error,
    closeAndClearResults,
    selectConversationAndClearResults,
  };
};
