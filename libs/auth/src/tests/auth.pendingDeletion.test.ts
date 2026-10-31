import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@nebula-chat/db';
import type { Logger } from '@nebula-chat/otel';
import type { AuthStore } from '@nebula-chat/redis';
import { deleteSessionCookie } from 'better-auth/cookies';
import { createAuth } from '../auth';

// Expiring the cookie needs better-auth's whole cookie config; only the call matters here.
vi.mock('better-auth/cookies', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  deleteSessionCookie: vi.fn(),
}));

const NOW = new Date('2026-10-20T10:00:00.000Z');
const PENDING_AT = new Date('2026-10-01T00:00:00.000Z');

const logger = {
  child: () => logger,
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

/** Fakes `select().from().where()` (rows by call order) and `update().set().where()`. */
const makeDb = (selectRows: unknown[][] = []) => {
  const queue = [...selectRows];
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where: updateWhere }));
  const db = {
    select: () => ({ from: () => ({ where: async () => queue.shift() ?? [] }) }),
    update: vi.fn(() => ({ set })),
  };
  return { db: db as unknown as DbClient, update: db.update, set };
};

const build = (db: DbClient) =>
  createAuth({
    db,
    authStore: {} as AuthStore,
    logger: logger as unknown as Logger,
    secret: 'test-secret-that-is-long-enough-for-better-auth',
    baseURL: 'http://localhost:3000',
    sendEmail: vi.fn(),
    errorURL: 'http://localhost:5173/auth',
  });

type HookContext = Parameters<
  NonNullable<NonNullable<ReturnType<typeof build>['options']['hooks']>['before']>
>[0];

/** The slice of an endpoint context the before hook reads. */
const hookContext = ({
  path,
  body,
  accounts = [],
  sessionCreatedAt = NOW,
  verifyPassword = vi.fn().mockResolvedValue(true),
}: {
  path: string;
  body?: Record<string, unknown>;
  accounts?: { providerId: string; password?: string }[];
  sessionCreatedAt?: Date;
  verifyPassword?: ReturnType<typeof vi.fn>;
}) => {
  const deleteUserSessions = vi.fn().mockResolvedValue(undefined);
  const ctx = {
    path,
    body,
    json: (value: unknown) => value,
    setCookie: vi.fn(),
    context: {
      session: {
        user: { id: 'user-1', email: 'ada@example.com' },
        session: { createdAt: sessionCreatedAt },
      },
      sessionConfig: { freshAge: 24 * 60 * 60 },
      password: { verify: verifyPassword },
      authCookies: { sessionToken: { name: 'session', attributes: {} } },
      internalAdapter: { findAccounts: async () => accounts, deleteUserSessions },
    },
  };
  return { ctx: ctx as unknown as HookContext, deleteUserSessions, verifyPassword };
};

beforeEach(() => vi.mocked(deleteSessionCookie).mockClear());

const PASSWORD_ACCOUNT = { providerId: 'credential', password: 'hash' };

describe('createAuth Account deletion', () => {
  it('marks the User pending and revokes every auth session instead of deleting', async () => {
    vi.useFakeTimers({ now: NOW });
    const { db, set } = makeDb();
    const { ctx, deleteUserSessions } = hookContext({
      path: '/delete-user',
      body: { password: 'secret' },
      accounts: [PASSWORD_ACCOUNT],
    });

    const result = await build(db).options.hooks!.before!(ctx);

    expect(set).toHaveBeenCalledWith({ pendingDeletionAt: NOW });
    expect(deleteUserSessions).toHaveBeenCalledWith('user-1');
    expect(deleteSessionCookie).toHaveBeenCalledOnce();
    // The response the client got when the delete was immediate.
    expect(result).toEqual({ success: true, message: 'User deleted' });
    vi.useRealTimers();
  });

  it('leaves the User untouched when the password is wrong', async () => {
    const { db, set } = makeDb();
    const { ctx, deleteUserSessions } = hookContext({
      path: '/delete-user',
      body: { password: 'wrong' },
      accounts: [PASSWORD_ACCOUNT],
      verifyPassword: vi.fn().mockResolvedValue(false),
    });

    await expect(build(db).options.hooks!.before!(ctx)).rejects.toMatchObject({
      status: 'BAD_REQUEST',
    });

    expect(set).not.toHaveBeenCalled();
    expect(deleteUserSessions).not.toHaveBeenCalled();
  });

  it('still requires the password of a User who has one', async () => {
    const { db, set } = makeDb();
    const { ctx } = hookContext({ path: '/delete-user', body: {}, accounts: [PASSWORD_ACCOUNT] });

    await expect(build(db).options.hooks!.before!(ctx)).rejects.toMatchObject({
      body: { code: 'PASSWORD_REQUIRED' },
    });

    expect(set).not.toHaveBeenCalled();
  });

  it('accepts a password-less User signed in under a day ago', async () => {
    vi.useFakeTimers({ now: NOW });
    const { db, set } = makeDb();
    const { ctx } = hookContext({
      path: '/delete-user',
      body: {},
      sessionCreatedAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    });

    await build(db).options.hooks!.before!(ctx);

    expect(set).toHaveBeenCalledWith({ pendingDeletionAt: NOW });
    vi.useRealTimers();
  });

  it('refuses a password-less User whose sign-in is over a day old', async () => {
    vi.useFakeTimers({ now: NOW });
    const { db, set } = makeDb();
    const { ctx } = hookContext({
      path: '/delete-user',
      body: {},
      sessionCreatedAt: new Date(NOW.getTime() - 25 * 60 * 60 * 1000),
    });

    await expect(build(db).options.hooks!.before!(ctx)).rejects.toMatchObject({
      status: 'BAD_REQUEST',
    });

    expect(set).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('refuses a deletion token, which better-auth would honour with a hard delete', async () => {
    const { db, set } = makeDb();
    const { ctx } = hookContext({
      path: '/delete-user',
      body: { password: 'secret', token: 'forged' },
      accounts: [PASSWORD_ACCOUNT],
    });

    await expect(build(db).options.hooks!.before!(ctx)).rejects.toMatchObject({
      status: 'BAD_REQUEST',
    });

    expect(set).not.toHaveBeenCalled();
  });
});

describe('createAuth sign-up with a pending email', () => {
  it('answers a typed conflict telling the user to sign in', async () => {
    const { db } = makeDb([[{ pendingDeletionAt: PENDING_AT }]]);
    const { ctx } = hookContext({ path: '/sign-up/email', body: { email: 'Ada@Example.com' } });

    await expect(build(db).options.hooks!.before!(ctx)).rejects.toMatchObject({
      status: 'CONFLICT',
      body: { code: 'EMAIL_PENDING_DELETION' },
    });
  });

  it('lets an email with no pending User sign up', async () => {
    const { db } = makeDb([[]]);
    const { ctx } = hookContext({ path: '/sign-up/email', body: { email: 'new@example.com' } });

    await expect(build(db).options.hooks!.before!(ctx)).resolves.toBeUndefined();
  });
});

type SessionCreateBefore = (session: { userId: string }, ctx: unknown) => Promise<boolean | void>;

const sessionHook = (db: DbClient) =>
  build(db).options.databaseHooks!.session!.create!.before as SessionCreateBefore;

const signInContext = (path: string) => {
  const createVerificationValue = vi.fn().mockResolvedValue(undefined);
  const redirect = vi.fn((url: string) => new Error(`redirect:${url}`));
  const ctx = { path, redirect, context: { internalAdapter: { createVerificationValue } } };
  return { ctx, createVerificationValue, redirect };
};

describe('createAuth sign-in of a pending User', () => {
  it('lets a normal User sign in', async () => {
    const { db } = makeDb([[{ pendingDeletionAt: null }]]);
    const { ctx, createVerificationValue } = signInContext('/sign-in/email');

    await expect(sessionHook(db)({ userId: 'user-1' }, ctx)).resolves.toBeUndefined();

    expect(createVerificationValue).not.toHaveBeenCalled();
  });

  it('issues no session and answers the Purge date with a restore token', async () => {
    const { db } = makeDb([[{ pendingDeletionAt: PENDING_AT }]]);
    const { ctx, createVerificationValue } = signInContext('/sign-in/email');

    const outcome = sessionHook(db)({ userId: 'user-1' }, ctx);

    await expect(outcome).rejects.toMatchObject({
      status: 'FORBIDDEN',
      body: {
        code: 'ACCOUNT_PENDING_DELETION',
        purgeDate: '2026-10-31T00:00:00.000Z',
        restoreToken: expect.stringMatching(/^[0-9a-f]{64}$/),
      },
    });
    expect(createVerificationValue).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: expect.stringMatching(/^restore-account:[0-9a-f]{64}$/),
        value: 'user-1',
      }),
    );
  });

  it('sends a social sign-in to the client auth page with the Purge date and token', async () => {
    const { db } = makeDb([[{ pendingDeletionAt: PENDING_AT }]]);
    const { ctx, redirect } = signInContext('/callback/google');

    await expect(sessionHook(db)({ userId: 'user-1' }, ctx)).rejects.toThrow(/^redirect:/);

    const target = new URL(redirect.mock.calls[0]![0]);
    expect(target.origin + target.pathname).toBe('http://localhost:5173/auth');
    expect(target.searchParams.get('pending')).toBe('2026-10-31T00:00:00.000Z');
    expect(target.searchParams.get('restoreToken')).toMatch(/^[0-9a-f]{64}$/);
  });
});
