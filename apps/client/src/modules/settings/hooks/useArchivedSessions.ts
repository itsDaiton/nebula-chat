import { ListSessionsArchived } from '@/libs/api/generated/model/listSessionsArchived';
import { useListSessionsInfinite } from '@/libs/api/generated/sessions/sessions';
import { paginationConfig } from '@/shared/config/paginationConfig';

/** The caller's archived Sessions, newest first, a page at a time. */
export const useArchivedSessions = () => {
  const { data, isPending, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useListSessionsInfinite(
      { archived: ListSessionsArchived.true, limit: paginationConfig.defaultLimit },
      {
        query: {
          initialPageParam: undefined,
          getNextPageParam: (lastPage) =>
            lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
          select: (result) => result.pages.flatMap((page) => page.sessions),
          meta: { inlineError: true },
        },
      },
    );

  return {
    sessions: data ?? [],
    isLoading: isPending,
    error,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    loadMore: () => void fetchNextPage(),
  };
};
