import { useSearchConversations } from '@/libs/api/generated/conversations/conversations';
import type { UseConversationsSearchParams } from '@/modules/conversations/types/types';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';
import { toConversation } from '@/modules/conversations/utils/toConversation';

export const useConversationsSearch = ({
  localConversations,
  onClose,
  onConversationClick,
}: UseConversationsSearchParams) => {
  const { searchQuery, setSearchQuery, debouncedQuery, clearSearch } =
    useConversationsSearchStore();

  const trimmedSearchQuery = searchQuery.trim();
  const trimmedDebouncedQuery = debouncedQuery.trim();

  const {
    data: searchResults,
    isFetching,
    error,
  } = useSearchConversations(
    { q: trimmedDebouncedQuery },
    {
      query: {
        enabled: Boolean(trimmedDebouncedQuery),
        select: (results) => results.map(toConversation),
      },
    },
  );

  const isPending = trimmedSearchQuery !== trimmedDebouncedQuery;
  const hasSettledSearchQuery = Boolean(trimmedSearchQuery) && !isPending;
  const filteredConversations = hasSettledSearchQuery ? (searchResults ?? []) : localConversations;

  const closeAndClearSearch = () => {
    clearSearch();
    onClose();
  };

  const selectConversationAndClearSearch = (conversationId: string) => {
    clearSearch();
    onConversationClick(conversationId);
  };

  return {
    searchQuery,
    setSearchQuery,
    filteredConversations,
    isSearching: isPending || isFetching,
    error: hasSettledSearchQuery ? error : null,
    closeAndClearSearch,
    selectConversationAndClearSearch,
  };
};
