import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import type { SecondFactorAttempt } from '@/modules/auth/types/types';
import { refreshSessionPastCache } from '@/modules/auth/utils/refreshSessionPastCache';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/** Finishes a sign-in the two-factor plugin held back; better-auth refetches the session once it passes. */
export const useVerifySecondFactor = () => {
  const onIdentityChange = useIdentityChange();

  return useMutation({
    mutationFn: async ({ method, code, trustDevice }: SecondFactorAttempt) => {
      await runAuthRequest(() =>
        method === 'totp'
          ? authClient.twoFactor.verifyTotp({ code, trustDevice })
          : authClient.twoFactor.verifyBackupCode({ code, trustDevice }),
      );
      // The verify response's cookie cache predates the `twoFactorVerified` mark, so the admin guard would ask again.
      await refreshSessionPastCache();
    },
    onSuccess: () => onIdentityChange(),
    meta: { inlineError: true },
  });
};
