import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getGetSessionQueryKey,
  getListSessionsInfiniteQueryKey,
  useRenameSession,
} from '@/libs/api/generated/sessions/sessions';
import { resources } from '@/resources';

/** Renames a Session; the header and the left panel's list refetch, and a failure leaves the old title showing. */
export const useSessionRename = () => {
  const queryClient = useQueryClient();

  const { mutate } = useRenameSession({
    mutation: {
      // The failure is toasted here with the rename wording, not by the global handler.
      meta: { inlineError: true },
      onError: () => toast.error(resources.sessions.rename.failed),
      onSettled: (_session, _error, { sessionId }) => {
        void queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
        void queryClient.invalidateQueries({ queryKey: getListSessionsInfiniteQueryKey() });
      },
    },
  });

  return (sessionId: string, title: string) => mutate({ sessionId, data: { title } });
};
