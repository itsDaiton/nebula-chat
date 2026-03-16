import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { ConversationsContextValue } from '../types/types';
import { useConversationsStore } from '../stores/useConversationsStore';

const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

export function ConversationsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const {
    conversations,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
    fetchConversations,
  } = useConversationsStore();

  useEffect(() => {
    fetchConversations(true).catch(() => {});
  }, [fetchConversations]);

  const contextValue = useMemo(
    () => ({ conversations, isLoading, isLoadingMore, error, hasMore, loadMore, refetch }),
    [conversations, isLoading, isLoadingMore, error, hasMore, loadMore, refetch],
  );

  return (
    <ConversationsContext.Provider value={contextValue}>{children}</ConversationsContext.Provider>
  );
}

export function useConversationsContext() {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error('useConversationsContext must be used within ConversationsProvider');
  }
  return context;
}
