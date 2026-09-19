import { fromPartial } from '@total-typescript/shoehorn';
import type { SessionData } from '@nebula-chat/auth';

/**
 * Session fixtures for route tests. Tests `vi.mock('@backend/auth')` so
 * `auth.api.getSession` resolves to one of these, exercising the real
 * `requireUser` / `requireRegistered` gates without a live better-auth instance
 * (ADR-0008: assert external behavior, never better-auth internals). Only the
 * fields the gates and owner-wiring read (`user.id`, `user.isAnonymous`) matter;
 * `fromPartial` fills the rest of better-auth's shape.
 */

/** A Registered user (uncapped, passes `requireRegistered`). */
export const REGISTERED_USER_ID = '99999999-9999-4999-8999-999999999999';

/** A Guest user (metered by the message allowance, fails `requireRegistered`). */
const GUEST_USER_ID = '88888888-8888-4888-8888-888888888888';

export const registeredSession = (): SessionData =>
  fromPartial({ user: { id: REGISTERED_USER_ID, isAnonymous: false } });

export const guestSession = (): SessionData =>
  fromPartial({ user: { id: GUEST_USER_ID, isAnonymous: true } });
