import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import type { SignInCredentials } from '@/modules/auth/types/types';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/** Email sign-in; the server claims a current Guest's conversations into the account. */
export const useSignIn = () => {
  const onIdentityChange = useIdentityChange();

  return useMutation({
    mutationFn: (credentials: SignInCredentials) =>
      runAuthRequest(() => authClient.signIn.email(credentials)),
    onSuccess: onIdentityChange,
  });
};
