import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/** Trades a Pending-deletion sign-in's restore token for a session, ending the Pending deletion. */
export const useRestoreAccount = () => {
  const onIdentityChange = useIdentityChange();

  return useMutation({
    // A server plugin endpoint with no client plugin, so it goes through better-auth's fetch.
    mutationFn: (token: string) =>
      runAuthRequest(() =>
        authClient.$fetch('/restore-account', { method: 'POST', body: { token } }),
      ),
    onSuccess: () => {
      authClient.$store.notify('$sessionSignal');
      onIdentityChange();
    },
    meta: { inlineError: true },
  });
};
