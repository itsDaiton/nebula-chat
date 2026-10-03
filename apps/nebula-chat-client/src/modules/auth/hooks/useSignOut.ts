import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import { SESSION_BOOTSTRAP_KEY } from '@/modules/auth/hooks/useSessionBootstrap';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/** Ends the session; AuthGate's bootstrap then re-mints a Guest so the app stays usable. */
export const useSignOut = () => {
  const queryClient = useQueryClient();
  const onIdentityChange = useIdentityChange();

  return useMutation({
    mutationFn: () => runAuthRequest(() => authClient.signOut()),
    onSuccess: () => {
      // Reset first: the gate unmounts the app before anything can fetch without a session.
      void queryClient.resetQueries({ queryKey: SESSION_BOOTSTRAP_KEY });
      onIdentityChange();
    },
  });
};
