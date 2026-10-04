import { useMutation } from '@tanstack/react-query';
import type { AuthResult } from '@/modules/auth/types/types';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/** An auth form's better-auth call; the form shows a failure under the field it concerns. */
export const useAuthMutation = <Values>(
  request: (values: Values) => Promise<AuthResult>,
  onSuccess?: () => void,
) =>
  useMutation({
    mutationFn: (values: Values) => runAuthRequest(() => request(values)),
    onSuccess,
    meta: { inlineError: true },
  });
