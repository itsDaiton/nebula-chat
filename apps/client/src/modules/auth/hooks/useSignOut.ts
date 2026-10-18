import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { useAfterSignOut } from '@/modules/auth/hooks/useAfterSignOut';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/** Ends the session; AuthGate's bootstrap then re-mints a Guest so the app stays usable. */
export const useSignOut = () => {
  const afterSignOut = useAfterSignOut();

  return useMutation({
    mutationFn: () => runAuthRequest(() => authClient.signOut()),
    onSuccess: afterSignOut,
  });
};
