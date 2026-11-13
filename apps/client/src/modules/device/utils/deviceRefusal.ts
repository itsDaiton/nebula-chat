import { AuthRequestError } from '@/modules/auth/utils/AuthRequestError';
import type { DeviceRefusal } from '@/modules/device/types/types';

const SERVER_REFUSALS: Partial<Record<string, DeviceRefusal>> = {
  ADMIN_REQUIRED: 'adminRequired',
  TWO_FACTOR_REQUIRED: 'twoFactorRequired',
};

/** Why this auth session cannot approve, as the client reads it; the server holds the same line. */
export const sessionRefusal = (auth: {
  isAdmin: boolean;
  hasTwoFactor: boolean;
  isTwoFactorVerified: boolean;
}): DeviceRefusal | undefined => {
  if (!auth.isAdmin) return 'adminRequired';
  if (!auth.hasTwoFactor || !auth.isTwoFactorVerified) return 'twoFactorRequired';
  return undefined;
};

/** The server's refusal behind a failed device request, when the client's session was stale. */
export const serverRefusal = (error: unknown): DeviceRefusal | undefined =>
  error instanceof AuthRequestError ? SERVER_REFUSALS[error.authCode ?? ''] : undefined;
