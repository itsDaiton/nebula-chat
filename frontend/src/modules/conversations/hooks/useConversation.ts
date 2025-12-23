import { useState, useEffect, useCallback } from 'react';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import type { ConversationWithMessages } from '../types/types';

export function useConversation(conversationId: string | null | undefined) {
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(SERVER_CONFIG.getApiEndpoint(`/api/conversations/${id}`));

      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }

      const data = await response.json();
      setConversation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setConversation(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (conversationId) {
      void fetchConversation(conversationId);
    } else {
      setConversation(null);
      setError(null);
    }
  }, [conversationId, fetchConversation]);

  return {
    conversation,
    isLoading,
    error,
    refetch: conversationId ? () => fetchConversation(conversationId) : undefined,
  };
}
