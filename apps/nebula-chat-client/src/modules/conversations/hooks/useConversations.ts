import { useListConversationsInfinite } from '@/libs/api/generated/conversations/conversations';
import { toConversation } from '@/modules/conversations/utils/toConversation';
import { paginationConfig } from '@/shared/config/paginationConfig';

/** The caller's conversations, newest first, paged by cursor as the sidebar scrolls. */
export const useConversations = () => {
  const { data, isPending, isFetchingNextPage, error, hasNextPage, fetchNextPage } =
    useListConversationsInfinite(
      { limit: paginationConfig.defaultLimit },
      {
        query: {
          initialPageParam: undefined,
          getNextPageParam: (lastPage) =>
            lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
          select: (result) =>
            result.pages.flatMap((page) => page.conversations.map(toConversation)),
        },
      },
    );

  const loadMore = async () => {
    await fetchNextPage();
  };

  return {
    conversations: data ?? [],
    isLoading: isPending,
    isLoadingMore: isFetchingNextPage,
    error,
    hasMore: hasNextPage,
    loadMore,
  };
};
