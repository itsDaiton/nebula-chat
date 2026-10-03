import { hashKey, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { SESSION_BOOTSTRAP_KEY } from '@/modules/auth/hooks/useSessionBootstrap';
import { route } from '@/routing/routes';

/** Drops the previous user's server state and returns to the chat root. */
export const useIdentityChange = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const bootstrapHash = hashKey(SESSION_BOOTSTRAP_KEY);

  return () => {
    // Removed, not reset: nothing refetches as the old user, and claimed conversations load fresh.
    queryClient.removeQueries({ predicate: (query) => query.queryHash !== bootstrapHash });
    void navigate(route.chat.root());
  };
};
