import { useSearchSessions } from '@/libs/api/generated/sessions/sessions';
import type { UseSessionsSearchParams } from '@/modules/sessions/types/types';
import { useSessionsSearchStore } from '@/modules/sessions/stores/useSessionsSearchStore';

export const useSessionsSearch = ({
  localSessions,
  onClose,
  onSessionClick,
}: UseSessionsSearchParams) => {
  const { searchQuery, setSearchQuery, debouncedQuery, clearSearch } = useSessionsSearchStore();

  const trimmedSearchQuery = searchQuery.trim();
  const trimmedDebouncedQuery = debouncedQuery.trim();

  const {
    data: searchResults,
    isFetching,
    error,
  } = useSearchSessions(
    { q: trimmedDebouncedQuery },
    {
      query: {
        enabled: Boolean(trimmedDebouncedQuery),
      },
    },
  );

  const isPending = trimmedSearchQuery !== trimmedDebouncedQuery;
  const hasSettledSearchQuery = Boolean(trimmedSearchQuery) && !isPending;
  const filteredSessions = hasSettledSearchQuery ? (searchResults ?? []) : localSessions;

  const closeAndClearSearch = () => {
    clearSearch();
    onClose();
  };

  const selectSessionAndClearSearch = (sessionId: string) => {
    clearSearch();
    onSessionClick(sessionId);
  };

  return {
    searchQuery,
    setSearchQuery,
    filteredSessions,
    isSearching: isPending || isFetching,
    error: hasSettledSearchQuery ? error : null,
    closeAndClearSearch,
    selectSessionAndClearSearch,
  };
};
