import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { verifyEmailCallbackUrl } from '@/modules/auth/utils/authCallbackUrl';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';

/** Re-sends the signed-in user's verification email; the query client toasts a failure. */
export const useResendVerification = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: () =>
      runAuthRequest(() =>
        authClient.sendVerificationEmail({
          email: user?.email ?? '',
          callbackURL: verifyEmailCallbackUrl(),
        }),
      ),
    onSuccess: () => {
      toaster.create({ type: 'success', title: resources.auth.emailVerification.sent });
    },
  });
};
