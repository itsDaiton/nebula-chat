import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import type { SignUpCredentials } from '@/modules/auth/types/types';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/** Email registration; the server claims a current Guest's conversations into the account. */
export const useSignUp = () => {
  const onIdentityChange = useIdentityChange();

  return useMutation({
    mutationFn: (credentials: SignUpCredentials) =>
      runAuthRequest(() => authClient.signUp.email(credentials)),
    onSuccess: onIdentityChange,
  });
};
