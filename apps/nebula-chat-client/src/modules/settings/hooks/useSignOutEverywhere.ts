import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { useAfterSignOut } from '@/modules/auth/hooks/useAfterSignOut';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/** Revokes every auth session of the user, then signs this device out, which revoking leaves holding a dead cookie. */
export const useSignOutEverywhere = () => {
  const afterSignOut = useAfterSignOut();

  return useMutation({
    mutationFn: async () => {
      await runAuthRequest(() => authClient.revokeSessions());
      await runAuthRequest(() => authClient.signOut());
    },
    onSuccess: afterSignOut,
  });
};
