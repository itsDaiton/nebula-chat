import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import type { SecondFactorAttempt } from '@/modules/auth/types/types';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/** Finishes a sign-in the two-factor plugin held back; better-auth refetches the session once it passes. */
export const useVerifySecondFactor = () => {
  const onIdentityChange = useIdentityChange();

  return useMutation({
    mutationFn: ({ method, code, trustDevice }: SecondFactorAttempt) =>
      runAuthRequest(() =>
        method === 'totp'
          ? authClient.twoFactor.verifyTotp({ code, trustDevice })
          : authClient.twoFactor.verifyBackupCode({ code, trustDevice }),
      ),
    onSuccess: () => onIdentityChange(),
    meta: { inlineError: true },
  });
};
