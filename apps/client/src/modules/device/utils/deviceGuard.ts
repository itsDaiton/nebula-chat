import { redirect } from '@tanstack/react-router';
import { authClient } from '@/libs/auth/client';

/** Sends a Guest to sign in first; the sign-in returns to `/device` with the same code. */
export const requireSignedIn = async (userCode: string | undefined) => {
  const { data } = await authClient.getSession();
  if (!data || data.user.isAnonymous) {
    throw redirect({ to: '/auth', search: { device: userCode }, replace: true });
  }
};
