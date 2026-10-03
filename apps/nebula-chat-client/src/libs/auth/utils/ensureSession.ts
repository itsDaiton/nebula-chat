import { AppError } from '@nebula-chat/errors';
import { authClient } from '@/libs/auth/client';
import { resources } from '@/resources';

/** Resolves once a session exists, minting a Guest when there is none (the server never does). */
export const ensureSession = async (): Promise<void> => {
  try {
    const current = await authClient.getSession();
    if (current.error) throw current.error;
    if (current.data) return;

    const guest = await authClient.signIn.anonymous();
    if (guest.error) throw guest.error;
  } catch (error) {
    throw new AppError('Internal', resources.auth.sessionFailed, { cause: error });
  }
};
