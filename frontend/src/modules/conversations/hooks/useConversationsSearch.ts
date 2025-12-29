import { useState, useEffect } from 'react';
import type { Conversation } from '../types/types';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { handleHttpError, handleNetworkError } from '@/shared/utils/errorHandler';

export function useConversationsSearch(localConversations: Conversation[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isLoading = searchQuery.trim() !== debouncedSearchQuery.trim() || isSearching;

  useEffect(() => {
    const searchConversations = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults([]);
        setError(null);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const response = await fetch(
          SERVER_CONFIG.getApiEndpoint(
            `/api/conversations/search?q=${encodeURIComponent(debouncedSearchQuery)}`,
          ),
        );

        if (!response.ok) {
          await handleHttpError(response);
        }

        const data = await response.json();
        setSearchResults(data);
      } catch (err) {
        try {
          handleNetworkError(err);
        } catch (handledError) {
          setError(handledError instanceof Error ? handledError.message : 'Search failed');
        }
      } finally {
        setIsSearching(false);
      }
    };

    void searchConversations();
  }, [debouncedSearchQuery]);

  const filteredConversations = searchQuery.trim() ? searchResults : localConversations;

  return {
    searchQuery,
    setSearchQuery,
    filteredConversations,
    isSearching: isLoading,
    error,
  };
}
