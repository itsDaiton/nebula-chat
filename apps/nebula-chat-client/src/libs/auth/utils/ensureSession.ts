import { AppError } from '@nebula-chat/errors';
import { authClient } from '@/libs/auth/client';
import type { AuthUser } from '@/libs/auth/types/types';
import { resources } from '@/resources';

const sessionFailed = (cause: unknown) =>
  new AppError('Internal', resources.auth.sessionFailed, { cause });

/** Resolves the current user, minting a Guest when there is no session (the server never does). */
export const ensureSession = async (): Promise<AuthUser> => {
  try {
    const current = await authClient.getSession();
    if (current.error) throw current.error;
    if (current.data) return current.data.user;

    const guest = await authClient.signIn.anonymous();
    if (guest.error) throw guest.error;
    return guest.data.user;
  } catch (error) {
    throw sessionFailed(error);
  }
};
