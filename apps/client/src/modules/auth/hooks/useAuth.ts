import { authClient } from '@/libs/auth/client';

/** The current session, read from better-auth's own session store. */
export const useAuth = () => {
  const { data, isPending } = authClient.useSession();
  const user = data?.user ?? null;
  const isRegistered = user !== null && user.isAnonymous !== true;
  // The admin and two-factor plugins add these fields to the user once the server enables them.
  const extras = user as { role?: string | null; twoFactorEnabled?: boolean | null } | null;

  return {
    session: data,
    user,
    isPending,
    isGuest: user?.isAnonymous === true,
    isRegistered,
    isAdmin: extras?.role === 'admin',
    hasTwoFactor: extras?.twoFactorEnabled === true,
    // Verification is not required to sign in, so a Registered user may still owe it.
    needsEmailVerification: isRegistered && !user.emailVerified,
  };
};
