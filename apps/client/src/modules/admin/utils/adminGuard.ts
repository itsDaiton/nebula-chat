import type { QueryClient } from '@tanstack/react-query';
import { notFound, redirect } from '@tanstack/react-router';
import { authClient } from '@/libs/auth/client';
import type { UserPluginFields } from '@/modules/auth/types/types';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';

// Short, so a burst of filter changes reads the session once yet a fresh 2FA setup is seen within seconds.
const SESSION_STALE_TIME = 5_000;

/** Admits an Admin whose auth session passed 2FA; an Admin without it is sent to Settings, everyone else gets not-found. */
export const requireTwoFactorAdmin = async (queryClient: QueryClient) => {
  const current = await queryClient.fetchQuery({
    queryKey: ['auth', 'admin-session'],
    queryFn: async () => (await authClient.getSession()).data ?? null,
    staleTime: SESSION_STALE_TIME,
  });
  const user = current?.user as (UserPluginFields & { emailVerified?: boolean }) | undefined;
  if (user?.role !== 'admin' || !user.emailVerified) throw notFound();

  const session = current?.session as { twoFactorVerified?: boolean | null };
  if (user.twoFactorEnabled !== true || session.twoFactorVerified !== true) {
    useSettingsDialogStore.getState().openSettings('security');
    throw redirect({ to: '/', replace: true });
  }
};
