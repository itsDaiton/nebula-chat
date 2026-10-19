import { useListSessionsInfinite } from '@/libs/api/generated/sessions/sessions';
import { paginationConfig } from '@/shared/config/paginationConfig';

/** The caller's sessions, newest first, paged by cursor as the sidebar scrolls. */
export const useSessions = () => {
  const { data, isPending, isFetchingNextPage, error, hasNextPage, fetchNextPage } =
    useListSessionsInfinite(
      { limit: paginationConfig.defaultLimit },
      {
        query: {
          initialPageParam: undefined,
          getNextPageParam: (lastPage) =>
            lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
          select: (result) => result.pages.flatMap((page) => page.sessions),
        },
      },
    );

  const loadMore = async () => {
    await fetchNextPage();
  };

  return {
    sessions: data ?? [],
    isLoading: isPending,
    isLoadingMore: isFetchingNextPage,
    error,
    hasMore: hasNextPage,
    loadMore,
  };
};
