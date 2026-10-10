import { useQuery } from '@tanstack/react-query';
import { AppError, errorCodeForStatus } from '@nebula-chat/errors';
import { authClient } from '@/libs/auth/client';
import { resources } from '@/resources';

const ACCOUNTS_KEY = ['auth', 'accounts'] as const;

/** Whether the user signs in with a password, as opposed to only Google or GitHub. */
export const useHasPassword = () =>
  useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error)
        throw new AppError(errorCodeForStatus(error.status), resources.auth.errors.unknown);
      return data.some(({ providerId }) => providerId === 'credential');
    },
    // A failed lookup falls back to the password form. It also fails once the account is deleted,
    // when the dialog renders again before it unmounts.
    meta: { inlineError: true },
  });
