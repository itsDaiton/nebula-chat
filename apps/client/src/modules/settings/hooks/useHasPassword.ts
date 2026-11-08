import { useQuery } from '@tanstack/react-query';
import { AppError, errorCodeForStatus } from '@nebula-chat/errors';
import { authClient } from '@/libs/auth/client';
import { resources } from '@/resources';

export const ACCOUNTS_KEY = ['auth', 'accounts'] as const;

const useCredentialAccount = <T>(select: (credential: { updatedAt: Date } | undefined) => T) =>
  useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error)
        throw new AppError(errorCodeForStatus(error.status), resources.auth.errors.unknown);
      const credential = data.find(({ providerId }) => providerId === 'credential');
      return credential && { updatedAt: new Date(credential.updatedAt) };
    },
    select,
    // A failed lookup falls back to the password form. It also fails once the account is deleted,
    // when the dialog renders again before it unmounts.
    meta: { inlineError: true },
  });

/** Whether the user signs in with a password, as opposed to only Google or GitHub. */
export const useHasPassword = () => useCredentialAccount((credential) => credential !== undefined);

/** When the password was last set or changed; undefined while unknown or without a password. */
export const usePasswordChangedAt = () =>
  useCredentialAccount((credential) => credential?.updatedAt.toISOString());
