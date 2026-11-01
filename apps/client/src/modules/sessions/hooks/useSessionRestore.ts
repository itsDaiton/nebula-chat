import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getGetSessionQueryKey,
  getListSessionsInfiniteQueryKey,
  useRestoreSession,
} from '@/libs/api/generated/sessions/sessions';
import { resources } from '@/resources';

/** Restores an archived Session; the left panel's list and the Session itself refetch. */
export const useSessionRestore = () => {
  const queryClient = useQueryClient();

  return useRestoreSession({
    mutation: {
      onSuccess: (_session, { sessionId }) => {
        toast(resources.settings.archived.restored());
        void queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
      },
      // The prefix covers the active and the archived lists.
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: getListSessionsInfiniteQueryKey() }),
    },
  });
};
