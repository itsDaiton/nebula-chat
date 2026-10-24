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
