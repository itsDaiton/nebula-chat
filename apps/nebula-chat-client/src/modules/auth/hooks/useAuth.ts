import { authClient } from '@/libs/auth/client';

/** The current session, read from better-auth's own session store. */
export const useAuth = () => {
  const { data, isPending, error, refetch } = authClient.useSession();
  const user = data?.user ?? null;

  return {
    session: data,
    user,
    isPending,
    error,
    refetch,
    isGuest: user?.isAnonymous === true,
    isRegistered: user !== null && user.isAnonymous !== true,
  };
};
