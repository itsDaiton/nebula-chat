import { useMutation } from '@tanstack/react-query';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import type { AuthResult } from '@/modules/auth/types/types';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/** An email sign-in or sign-up; the server claims a current Guest's conversations into the account. */
export const useAuthMutation = <Values>(request: (values: Values) => Promise<AuthResult>) => {
  const onIdentityChange = useIdentityChange();

  return useMutation({
    mutationFn: (values: Values) => runAuthRequest(() => request(values)),
    onSuccess: onIdentityChange,
    // The form shows the failure under the field it concerns.
    meta: { inlineError: true },
  });
};
