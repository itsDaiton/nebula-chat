import { useState, useEffect, useCallback } from 'react';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import type { ConversationWithMessages } from '../types/types';
import { handleHttpError, handleNetworkError } from '../utils/errorHandler';

export function useConversation(conversationId: string | null | undefined) {
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setError(null);
      return;
    }

    const fetchConversation = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          SERVER_CONFIG.getApiEndpoint(`/api/conversations/${conversationId}`),
        );

        if (!response.ok) {
          await handleHttpError(response);
        }

        const data = await response.json();
        setConversation(data);
      } catch (err) {
        try {
          handleNetworkError(err);
        } catch (handledError) {
          setError(handledError instanceof Error ? handledError.message : 'Unknown error occurred');
        }
        setConversation(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchConversation();
  }, [conversationId]);

  const refetch = useCallback(async () => {
    if (!conversationId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        SERVER_CONFIG.getApiEndpoint(`/api/conversations/${conversationId}`),
      );

      if (!response.ok) {
        await handleHttpError(response);
      }

      const data = await response.json();
      setConversation(data);
    } catch (err) {
      try {
        handleNetworkError(err);
      } catch (handledError) {
        setError(handledError instanceof Error ? handledError.message : 'Unknown error occurred');
      }
      setConversation(null);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  return {
    conversation,
    isLoading,
    error,
    refetch,
  };
}
