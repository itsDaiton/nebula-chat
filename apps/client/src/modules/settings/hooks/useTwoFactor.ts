import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

// Errors show inline in the setting, so the global mutation handler stays quiet.
const meta = { inlineError: true };

/** Starts the setup: the TOTP URI to scan and the backup codes, which only count once a code is verified. */
export const useEnableTwoFactor = () =>
  useMutation({
    mutationFn: async (password: string) => {
      const { data } = await runAuthRequest(() => authClient.twoFactor.enable({ password }));
      return data && 'totpURI' in data
        ? { totpURI: data.totpURI, backupCodes: data.backupCodes }
        : { totpURI: '', backupCodes: [] };
    },
    meta,
  });

/** Confirms the setup with a code from the app; better-auth then refetches the session. */
export const useVerifyTwoFactor = () =>
  useMutation({
    mutationFn: (code: string) => runAuthRequest(() => authClient.twoFactor.verifyTotp({ code })),
    meta,
  });

export const useDisableTwoFactor = () =>
  useMutation({
    mutationFn: (password: string) =>
      runAuthRequest(() => authClient.twoFactor.disable({ password })),
    meta,
  });

/** Replaces the backup codes; the old ones stop working. */
export const useRegenerateBackupCodes = () =>
  useMutation({
    mutationFn: async (password: string) => {
      const { data } = await runAuthRequest(() =>
        authClient.twoFactor.generateBackupCodes({ password }),
      );
      return data?.backupCodes ?? [];
    },
    meta,
  });
