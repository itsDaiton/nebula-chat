import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import type { Conversation, ConversationsContextValue } from '../types/types';
import { handleHttpError, handleNetworkError } from '../utils/errorHandler';

const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchConversations = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await fetch(SERVER_CONFIG.getApiEndpoint('/api/conversations?limit=20'));

      if (!response.ok) {
        await handleHttpError(response);
      }

      const data = await response.json();
      setConversations(data.conversations);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      try {
        handleNetworkError(err);
      } catch (handledError) {
        setError(handledError instanceof Error ? handledError.message : 'Unknown error occurred');
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;

    setIsLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(
        SERVER_CONFIG.getApiEndpoint(`/api/conversations?limit=20&cursor=${nextCursor}`),
      );

      if (!response.ok) {
        await handleHttpError(response);
      }

      const data = await response.json();
      setConversations((prev) => [...prev, ...data.conversations]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      try {
        handleNetworkError(err);
      } catch (handledError) {
        setError(handledError instanceof Error ? handledError.message : 'Unknown error occurred');
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextCursor]);

  const refetch = useCallback(async () => {
    setIsLoadingMore(false);
    await fetchConversations(false);
  }, [fetchConversations]);

  useEffect(() => {
    void fetchConversations(true);
  }, [fetchConversations]);

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        loadMore,
        refetch,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversationsContext() {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error('useConversationsContext must be used within ConversationsProvider');
  }
  return context;
}
