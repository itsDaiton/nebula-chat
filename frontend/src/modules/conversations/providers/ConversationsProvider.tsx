import { useMemo, type ReactNode } from 'react';
import { ConversationsContext } from '@/modules/conversations/context/ConversationsContext';
import { useConversationsStore } from '@/modules/conversations/stores/useConversationsStore';

export function ConversationsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { conversations, isLoading, isLoadingMore, error, hasMore, loadMore, refetch } =
    useConversationsStore();

  const contextValue = useMemo(
    () => ({ conversations, isLoading, isLoadingMore, error, hasMore, loadMore, refetch }),
    [conversations, isLoading, isLoadingMore, error, hasMore, loadMore, refetch],
  );

  return (
    <ConversationsContext.Provider value={contextValue}>{children}</ConversationsContext.Provider>
  );
}
