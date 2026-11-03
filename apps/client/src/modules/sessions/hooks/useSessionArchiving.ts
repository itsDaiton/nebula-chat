import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { SessionPage } from '@/libs/api/generated/model/sessionPage';
import {
  getListSessionsInfiniteQueryKey,
  useArchiveSession,
  useRestoreSession,
} from '@/libs/api/generated/sessions/sessions';
import type { ArchiveContext } from '@/modules/sessions/types/types';
import { resources } from '@/resources';

/** Archives a Session out of the list at once, rolling back on failure and offering an undo that restores it. */
export const useSessionArchiving = () => {
  const queryClient = useQueryClient();
  // Not `useParams`: subscribing the list to the router re-renders it as the cache is cleared on sign-out, refetching as nobody.
  const router = useRouter();
  const listKey = getListSessionsInfiniteQueryKey();
  const refreshList = () => queryClient.invalidateQueries({ queryKey: listKey });

  const { mutate: restore } = useRestoreSession({ mutation: { onSettled: refreshList } });

  const { mutate } = useArchiveSession({
    mutation: {
      onMutate: async ({ sessionId }): Promise<ArchiveContext> => {
        await queryClient.cancelQueries({ queryKey: listKey });
        const snapshot = queryClient.getQueriesData<InfiniteData<SessionPage>>({
          queryKey: listKey,
        });
        const title = snapshot
          .flatMap(([, data]) => data?.pages.flatMap((page) => page.sessions) ?? [])
          .find((session) => session.id === sessionId)?.title;
        queryClient.setQueriesData<InfiniteData<SessionPage>>(
          { queryKey: listKey },
          (data) =>
            data && {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                sessions: page.sessions.filter((session) => session.id !== sessionId),
              })),
            },
        );
        return { snapshot, title };
      },
      // The global mutation handler toasts the failure; only the list is ours to put back.
      onError: (_error, _variables, context) => {
        context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
      },
      onSuccess: (_session, { sessionId }, context) => {
        if (router.matchRoute({ to: '/s/$id', params: { id: sessionId } })) {
          void router.navigate({ to: '/' });
        }
        toast(resources.sessions.archived(context?.title), {
          action: { label: resources.sessions.undo, onClick: () => restore({ sessionId }) },
        });
      },
      onSettled: refreshList,
    },
  });

  return (sessionId: string) => mutate({ sessionId });
};
