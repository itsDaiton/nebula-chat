import { useState, useEffect } from 'react';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import type { Conversation } from '../types/types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(SERVER_CONFIG.getApiEndpoint('/api/conversations'));

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchConversations();
  }, []);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
}
