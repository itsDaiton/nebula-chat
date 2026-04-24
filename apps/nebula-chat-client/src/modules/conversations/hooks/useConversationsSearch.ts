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

  const isPending = searchQuery.trim() !== debouncedQuery.trim();
  const filteredConversations = searchQuery.trim() ? searchResults : localConversations;
  const closeAndClearResults = () => {
    clearResults();
    onClose();
  };
  const selectConversationAndClearResults = (conversationId: string) => {
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
