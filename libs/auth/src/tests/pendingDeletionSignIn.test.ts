import { deleteSessionCookie } from 'better-auth/cookies';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@nebula-chat/db';
import { pendingDeletionSignInPlugin } from '../pendingDeletionSignIn';

vi.mock('better-auth/cookies', () => ({ deleteSessionCookie: vi.fn() }));

const PENDING_AT = new Date('2026-10-01T00:00:00.000Z');
const TRUST = 'better-auth.trust_device';

/** Fakes `select().from().where()`, answering `rows` to every lookup. */
const makeDb = (rows: unknown[]) => {
  const where = vi.fn().mockResolvedValue(rows);
  return { db: { select: () => ({ from: () => ({ where }) }) } as unknown as DbClient, where };
};

const PENDING_2FA = [{ pendingDeletionAt: PENDING_AT, twoFactorEnabled: true }];

type Hook = { matcher: (ctx: never) => boolean; handler: (ctx: never) => Promise<unknown> };

const hooks = (db: DbClient) => {
  const { before, after } = pendingDeletionSignInPlugin(db).hooks as {
    before: Hook[];
    after: Hook[];
  };
  return { before: before[0]!, after: after[0]! };
};

const createAuthCookie = (name: string) => ({ name: `better-auth.${name}` });

const signIn = (db: DbClient, cookie?: string, email: unknown = 'ada@example.com') =>
  hooks(db).before.handler({
    path: '/sign-in/email',
    body: { email },
    headers: new Headers(cookie ? { cookie } : {}),
    context: { createAuthCookie },
  } as never);

const afterSignIn = (db: DbClient, newSession: unknown) => {
  const deleteSession = vi.fn().mockResolvedValue(undefined);
  const setNewSession = vi.fn();
  const result = hooks(db).after.handler({
    path: '/sign-in/email',
    context: { newSession, setNewSession, internalAdapter: { deleteSession } },
  } as never);
  return { result, deleteSession, setNewSession };
};

const SIGNED_IN = { user: { id: 'user-1' }, session: { token: 'session-token' } };

beforeEach(() => vi.mocked(deleteSessionCookie).mockClear());

describe('pendingDeletionSignInPlugin', () => {
  it('runs only on a password sign-in', () => {
    const { before, after } = hooks(makeDb([]).db);

    for (const hook of [before, after]) {
      expect(hook.matcher({ path: '/sign-in/email' } as never)).toBe(true);
      expect(hook.matcher({ path: '/two-factor/verify-totp' } as never)).toBe(false);
    }
  });

  describe('before the sign-in', () => {
    it('drops the trusted-device cookie of a pending two-factor User, so the code is asked', async () => {
      const { db } = makeDb(PENDING_2FA);

      const result = await signIn(db, `a=1; ${TRUST}=signed; b=2`);

      expect((result as { context: { headers: Headers } }).context.headers.get('cookie')).toBe(
        'a=1; b=2',
      );
    });

    it('keeps the cookie of a User who is not pending', async () => {
      const { db } = makeDb([{ pendingDeletionAt: null, twoFactorEnabled: true }]);

      await expect(signIn(db, `${TRUST}=signed`)).resolves.toBeUndefined();
    });

    it('keeps the cookie of a pending User without two-factor', async () => {
      const { db } = makeDb([{ pendingDeletionAt: PENDING_AT, twoFactorEnabled: false }]);

      await expect(signIn(db, `${TRUST}=signed`)).resolves.toBeUndefined();
    });

    it('skips the lookup when no trusted-device cookie is sent', async () => {
      const { db, where } = makeDb(PENDING_2FA);

      await expect(signIn(db, 'a=1')).resolves.toBeUndefined();
      await expect(signIn(db)).resolves.toBeUndefined();

      expect(where).not.toHaveBeenCalled();
    });

    it('skips a body without an email', async () => {
      const { db, where } = makeDb(PENDING_2FA);

      await expect(signIn(db, `${TRUST}=signed`, null)).resolves.toBeUndefined();

      expect(where).not.toHaveBeenCalled();
    });
  });

  describe('after the sign-in', () => {
    it('refuses a session that outlived the two-factor plugin for a pending User', async () => {
      const { db } = makeDb(PENDING_2FA);
      const { result, deleteSession, setNewSession } = afterSignIn(db, SIGNED_IN);

      const error = await result.catch((e: unknown) => e);

      expect(error).toMatchObject({
        status: 'FORBIDDEN',
        body: { code: 'ACCOUNT_PENDING_DELETION', purgeDate: '2026-10-31T00:00:00.000Z' },
      });
      expect((error as { body: object }).body).not.toHaveProperty('restoreToken');
      expect(deleteSession).toHaveBeenCalledWith('session-token');
      expect(setNewSession).toHaveBeenCalledWith(null);
      expect(deleteSessionCookie).toHaveBeenCalledOnce();
    });

    it('leaves a normal User signed in', async () => {
      const { db } = makeDb([{ pendingDeletionAt: null, twoFactorEnabled: true }]);
      const { result, deleteSession } = afterSignIn(db, SIGNED_IN);

      await expect(result).resolves.toBeUndefined();

      expect(deleteSession).not.toHaveBeenCalled();
    });

    it('does nothing once the two-factor plugin swapped the session for a challenge', async () => {
      const { db, where } = makeDb(PENDING_2FA);
      const { result } = afterSignIn(db, null);

      await expect(result).resolves.toBeUndefined();

      expect(where).not.toHaveBeenCalled();
    });
  });
});
