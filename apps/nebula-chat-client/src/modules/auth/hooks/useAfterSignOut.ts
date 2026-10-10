import { useQueryClient } from '@tanstack/react-query';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import { SESSION_BOOTSTRAP_KEY } from '@/modules/auth/hooks/useSessionBootstrap';

/** Once the auth session is gone (signed out, revoked or deleted): AuthGate re-mints a Guest, the app returns to chat. */
export const useAfterSignOut = () => {
  const queryClient = useQueryClient();
  const onIdentityChange = useIdentityChange();

  return () => {
    // Reset first: the gate unmounts the app before anything can fetch without a session.
    void queryClient.resetQueries({ queryKey: SESSION_BOOTSTRAP_KEY });
    onIdentityChange();
  };
};
