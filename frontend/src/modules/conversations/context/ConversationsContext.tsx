import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import type { Conversation } from '../types/types';
import { handleHttpError, handleNetworkError } from '../utils/errorHandler';

interface ConversationsContextValue {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await fetch(SERVER_CONFIG.getApiEndpoint('/api/conversations'));

      if (!response.ok) {
        await handleHttpError(response);
      }

      const data = await response.json();
      setConversations(data);
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

  const refetch = useCallback(async () => {
    // Refetch without showing loading state
    await fetchConversations(false);
  }, [fetchConversations]);

  useEffect(() => {
    void fetchConversations(true); // Show loading on initial fetch
  }, [fetchConversations]);

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        isLoading,
        error,
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
