import { fromPartial } from '@total-typescript/shoehorn';
import type { SessionData } from '@nebula-chat/auth';

/**
 * Session fixtures: tests `vi.mock('@server/auth')` so `auth.api.getSession` returns one, exercising the real gates (ADR-0008).
 * Only `user.id`, `isAnonymous` and `emailVerified` matter; `fromPartial` fills the rest.
 */

/** A Registered user (verified so uncapped, passes `requireRegistered`). */
export const REGISTERED_USER_ID = '99999999-9999-4999-8999-999999999999';

/** A Guest user (metered by the message allowance, fails `requireRegistered`). */
const GUEST_USER_ID = '88888888-8888-4888-8888-888888888888';

export const registeredSession = (): SessionData =>
  fromPartial({ user: { id: REGISTERED_USER_ID, isAnonymous: false, emailVerified: true } });

/** A Registered user who has not verified their email yet — metered like a Guest. */
export const unverifiedSession = (): SessionData =>
  fromPartial({ user: { id: REGISTERED_USER_ID, isAnonymous: false, emailVerified: false } });

export const guestSession = (): SessionData =>
  fromPartial({ user: { id: GUEST_USER_ID, isAnonymous: true } });

/** An Admin; the role, ban and two-factor fields are what `requireAdmin` reads. */
export const ADMIN_USER_ID = '77777777-7777-4777-8777-777777777777';

const admin = (user: object, session: object): SessionData =>
  fromPartial({
    user: {
      id: ADMIN_USER_ID,
      isAnonymous: false,
      emailVerified: true,
      role: 'admin',
      banned: false,
      twoFactorEnabled: true,
      ...user,
    },
    session: { twoFactorVerified: true, ...session },
  });

/** An Admin whose current auth session passed two-factor: the only one `requireAdmin` admits. */
export const adminSession = (): SessionData => admin({}, {});

/** An Admin who never enrolled in two-factor authentication. */
export const adminWithout2FASession = (): SessionData =>
  admin({ twoFactorEnabled: false }, { twoFactorVerified: false });

/** An Admin signed in on a trusted device, so this auth session skipped the second factor. */
export const adminTrustedDeviceSession = (): SessionData => admin({}, { twoFactorVerified: false });

/** A banned Admin, otherwise fully verified. */
export const bannedSession = (): SessionData => admin({ banned: true }, {});

/** An Admin whose email is not verified. */
export const unverifiedAdminSession = (): SessionData => admin({ emailVerified: false }, {});
