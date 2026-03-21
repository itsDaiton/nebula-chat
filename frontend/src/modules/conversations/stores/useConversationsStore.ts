import { create } from 'zustand';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import { paginationConfig } from '@/shared/config/paginationConfig';
import type { Conversation } from '../types/types';
import { handleHttpError, handleNetworkError } from '@/shared/utils/errorHandler';

interface ConversationsState {
  conversations: Conversation[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  fetchConversations: (showLoading?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  conversations: [],
  isLoading: true,
  isLoadingMore: false,
  error: null,
  nextCursor: null,
  hasMore: true,
  fetchConversations: async (showLoading = true) => {
    if (showLoading) set({ isLoading: true });
    set({ error: null });
    try {
      const response = await fetch(
        SERVER_CONFIG.getApiEndpoint(`/api/conversations?limit=${paginationConfig.defaultLimit}`),
      );

      if (!response.ok) {
        await handleHttpError(response);
      }

      const data = await response.json();
      set({
        conversations: data.conversations,
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
      });
    } catch (err) {
      try {
        handleNetworkError(err);
      } catch (handledError) {
        set({
          error: handledError instanceof Error ? handledError.message : 'Unknown error occurred',
        });
      }
    } finally {
      if (showLoading) set({ isLoading: false });
    }
  },
  loadMore: async () => {
    const { hasMore, isLoadingMore, nextCursor } = get();
    if (!hasMore || isLoadingMore || !nextCursor) return;

    set({ isLoadingMore: true, error: null });
    try {
      const response = await fetch(
        SERVER_CONFIG.getApiEndpoint(
          `/api/conversations?limit=${paginationConfig.defaultLimit}&cursor=${nextCursor}`,
        ),
      );

      if (!response.ok) {
        await handleHttpError(response);
      }

      const data = await response.json();
      set((state) => ({
        conversations: [...state.conversations, ...data.conversations],
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
      }));
    } catch (err) {
      try {
        handleNetworkError(err);
      } catch (handledError) {
        set({
          error: handledError instanceof Error ? handledError.message : 'Unknown error occurred',
        });
      }
    } finally {
      set({ isLoadingMore: false });
    }
  },
  refetch: async () => {
    set({ isLoadingMore: false });
    await get().fetchConversations(false);
  },
}));
