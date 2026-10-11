import { authClient } from '@/libs/auth/client';

/**
 * Re-reads the session past better-auth's cookie cache, which would otherwise keep showing a
 * user change made outside better-auth (a Profile image) for minutes, then updates `useAuth`.
 */
export const refreshSession = async () => {
  await authClient.getSession({ query: { disableCookieCache: true } });
  authClient.$store.notify('$sessionSignal');
};
