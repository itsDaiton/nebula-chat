import type { UserPluginFields } from '@/modules/auth/types/types';
import { authClient } from '@/libs/auth/client';

/** The current session, read from better-auth's own session store. */
export const useAuth = () => {
  const { data, isPending } = authClient.useSession();
  const user = data?.user ?? null;
  const isRegistered = user !== null && user.isAnonymous !== true;
  const pluginFields = user as UserPluginFields | null;

  return {
    session: data,
    user,
    isPending,
    isGuest: user?.isAnonymous === true,
    isRegistered,
    isAdmin: pluginFields?.role === 'admin',
    hasTwoFactor: pluginFields?.twoFactorEnabled === true,
    // Verification is not required to sign in, so a Registered user may still owe it.
    needsEmailVerification: isRegistered && !user.emailVerified,
  };
};
