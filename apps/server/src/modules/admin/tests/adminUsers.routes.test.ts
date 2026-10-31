import { fromPartial } from '@total-typescript/shoehorn';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';
import {
  adminSession,
  adminTrustedDeviceSession,
  adminWithout2FASession,
  ADMIN_USER_ID,
  bannedSession,
  guestSession,
  registeredSession,
} from '@server/test/session';

// ADR-0008: only the repositories are faked; the gate, validation and error handler are real.
vi.mock('@server/modules/admin/admin.repository', () => ({
  adminRepository: {
    listUsers: vi.fn(),
    findUserDetail: vi.fn(),
    findPendingDeletion: vi.fn(),
    clearPendingDeletion: vi.fn(),
  },
}));

vi.mock('@server/modules/audit/audit.repository', () => ({
  auditRepository: { insert: vi.fn(), list: vi.fn() },
}));

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { auth } from '@server/auth';
import { adminRepository } from '@server/modules/admin/admin.repository';
import { auditRepository } from '@server/modules/audit/audit.repository';

const repo = vi.mocked(adminRepository);
const audit = vi.mocked(auditRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const ROUTE = '/api/admin/users';
const COOKIE = { cookie: 'better-auth.session_token=abc' };
const USER_ID = '44444444-4444-4444-8444-444444444444';
const CREATED_AT = new Date('2026-09-01T08:00:00.000Z');
const UPDATED_AT = new Date('2026-09-02T09:00:00.000Z');
const PENDING_AT = new Date('2026-10-01T00:00:00.000Z');

const aRow = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  email: 'ada@example.com',
  name: 'Ada',
  emailVerified: true,
  isAnonymous: false,
  banned: false,
  banExpires: null,
  role: 'user',
  twoFactorEnabled: false,
  pendingDeletionAt: null,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  messagesSent: 7,
  ...overrides,
});

const DEFAULT_FILTERS = {
  search: undefined,
  status: undefined,
  sortBy: 'createdAt',
  order: 'desc',
};

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetSession.mockResolvedValue(adminSession() as never);
  repo.listUsers.mockResolvedValue(
    fromPartial({ users: [aRow()], nextCursor: USER_ID, hasMore: true }),
  );
  repo.findUserDetail.mockResolvedValue(fromPartial(aRow({ sessionsCount: 3, banReason: null })));
  repo.findPendingDeletion.mockResolvedValue({ id: USER_ID, pendingDeletionAt: PENDING_AT });
  repo.clearPendingDeletion.mockResolvedValue(undefined);
  audit.insert.mockResolvedValue(undefined);
});

describe('GET /api/admin/users', () => {
  it('lists newest first without a status, which leaves Guests to the repository default', async () => {
    const res = await app.inject({ method: 'GET', url: ROUTE, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      users: [
        {
          id: USER_ID,
          email: 'ada@example.com',
          name: 'Ada',
          status: 'registered',
          twoFactorEnabled: false,
          messagesSent: 7,
          createdAt: '2026-09-01T08:00:00.000Z',
          updatedAt: '2026-09-02T09:00:00.000Z',
        },
      ],
      nextCursor: USER_ID,
      hasMore: true,
    });
    expect(repo.listUsers).toHaveBeenCalledWith(DEFAULT_FILTERS, 10, undefined);
  });

  it('passes search, status, sort, order, limit and cursor through', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${ROUTE}?search=ada&status=guest&sortBy=messagesSent&order=asc&limit=5&cursor=${USER_ID}`,
      headers: COOKIE,
    });

    expect(res.statusCode).toBe(200);
    expect(repo.listUsers).toHaveBeenCalledWith(
      { search: 'ada', status: 'guest', sortBy: 'messagesSent', order: 'asc' },
      5,
      USER_ID,
    );
  });

  it.each([
    'status=nope',
    'sortBy=name',
    'order=up',
    'limit=0',
    'limit=101',
    'cursor=x',
    'search=',
  ])('rejects %s with a typed validation error', async (query) => {
    const res = await app.inject({ method: 'GET', url: `${ROUTE}?${query}`, headers: COOKIE });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, error: 'Validation' });
    expect(repo.listUsers).not.toHaveBeenCalled();
  });

  it.each([
    ['a Guest', aRow({ isAnonymous: true }), 'guest'],
    ['an unverified user', aRow({ emailVerified: false }), 'unverified'],
    ['an Admin', aRow({ role: 'admin' }), 'admin'],
    ['a banned user', aRow({ banned: true }), 'banned'],
    ['an Admin banned for good', aRow({ banned: true, role: 'admin' }), 'banned'],
    [
      'a user whose ban ran out',
      aRow({ banned: true, banExpires: new Date('2020-01-01T00:00:00.000Z') }),
      'registered',
    ],
  ])('reports %s with status %s', async (_label, row, status) => {
    repo.listUsers.mockResolvedValue(
      fromPartial({ users: [row], nextCursor: null, hasMore: false }),
    );

    const res = await app.inject({ method: 'GET', url: ROUTE, headers: COOKIE });

    expect(res.json().users[0].status).toBe(status);
  });

  it('writes no Audit entry', async () => {
    await app.inject({ method: 'GET', url: ROUTE, headers: COOKIE });

    expect(audit.insert).not.toHaveBeenCalled();
  });

  it.each([
    ['no session', () => mockedGetSession.mockResolvedValue(null as never), 401],
    ['a Guest', () => mockedGetSession.mockResolvedValue(guestSession() as never), 403],
    [
      'a Registered user',
      () => mockedGetSession.mockResolvedValue(registeredSession() as never),
      403,
    ],
    ['a banned Admin', () => mockedGetSession.mockResolvedValue(bannedSession() as never), 403],
    [
      'an Admin without two-factor',
      () => mockedGetSession.mockResolvedValue(adminWithout2FASession() as never),
      403,
    ],
    [
      'an Admin on a trusted device',
      () => mockedGetSession.mockResolvedValue(adminTrustedDeviceSession() as never),
      403,
    ],
  ])('refuses %s', async (_label, arrange, status) => {
    arrange();

    const res = await app.inject({ method: 'GET', url: ROUTE, headers: COOKIE });

    expect(res.statusCode).toBe(status);
    expect(repo.listUsers).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/users/:id', () => {
  it('answers the User with counts, timestamps and no ban', async () => {
    const res = await app.inject({ method: 'GET', url: `${ROUTE}/${USER_ID}`, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: USER_ID,
      email: 'ada@example.com',
      name: 'Ada',
      status: 'registered',
      twoFactorEnabled: false,
      messagesSent: 7,
      sessionsCount: 3,
      ban: null,
      pendingDeletionAt: null,
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-02T09:00:00.000Z',
    });
    expect(repo.findUserDetail).toHaveBeenCalledWith(USER_ID);
  });

  it('shows the reason and end of a ban that is in force', async () => {
    const expires = new Date(Date.now() + 86_400_000);
    repo.findUserDetail.mockResolvedValue(
      fromPartial(aRow({ banned: true, banExpires: expires, banReason: 'spam', sessionsCount: 0 })),
    );

    const res = await app.inject({ method: 'GET', url: `${ROUTE}/${USER_ID}`, headers: COOKIE });

    expect(res.json()).toMatchObject({
      status: 'banned',
      ban: { reason: 'spam', expiresAt: expires.toISOString() },
    });
  });

  it('answers an unknown id with a typed not-found', async () => {
    repo.findUserDetail.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `${ROUTE}/${USER_ID}`, headers: COOKIE });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
  });

  it('rejects an id that is not a uuid', async () => {
    const res = await app.inject({ method: 'GET', url: `${ROUTE}/nope`, headers: COOKIE });

    expect(res.statusCode).toBe(400);
    expect(repo.findUserDetail).not.toHaveBeenCalled();
  });

  it('refuses an Admin short of two-factor and writes no Audit entry', async () => {
    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);

    const res = await app.inject({ method: 'GET', url: `${ROUTE}/${USER_ID}`, headers: COOKIE });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'TwoFactorRequired' });
    expect(audit.insert).not.toHaveBeenCalled();
  });
});

describe('a User in Pending deletion', () => {
  it('shows that status and when deletion was asked for, even for a banned Admin', async () => {
    repo.findUserDetail.mockResolvedValue(
      fromPartial(
        aRow({
          role: 'admin',
          banned: true,
          banReason: null,
          pendingDeletionAt: PENDING_AT,
          sessionsCount: 0,
        }),
      ),
    );

    const res = await app.inject({ method: 'GET', url: `${ROUTE}/${USER_ID}`, headers: COOKIE });

    expect(res.json()).toMatchObject({
      status: 'pendingDeletion',
      pendingDeletionAt: '2026-10-01T00:00:00.000Z',
    });
  });

  it('is listed under the pendingDeletion filter', async () => {
    repo.listUsers.mockResolvedValue(
      fromPartial({
        users: [aRow({ pendingDeletionAt: PENDING_AT })],
        nextCursor: null,
        hasMore: false,
      }),
    );

    const res = await app.inject({
      method: 'GET',
      url: `${ROUTE}?status=pendingDeletion`,
      headers: COOKIE,
    });

    expect(res.json().users[0]).toMatchObject({ status: 'pendingDeletion' });
    expect(repo.listUsers).toHaveBeenCalledWith(
      { ...DEFAULT_FILTERS, status: 'pendingDeletion' },
      10,
      undefined,
    );
  });
});

describe('POST /api/admin/users/:id/restore', () => {
  const RESTORE = `${ROUTE}/${USER_ID}/restore`;

  it('restores a pending User and records the Admin in the Audit log', async () => {
    const res = await app.inject({ method: 'POST', url: RESTORE, headers: COOKIE });

    expect(res.statusCode).toBe(204);
    expect(repo.clearPendingDeletion).toHaveBeenCalledWith(USER_ID);
    expect(audit.insert).toHaveBeenCalledWith({
      actorType: 'admin',
      actorUserId: ADMIN_USER_ID,
      action: 'user.restored',
      targetType: 'user',
      targetId: USER_ID,
      detail: { pendingDeletionAt: '2026-10-01T00:00:00.000Z' },
    });
  });

  it('answers a typed conflict for a User who is not pending, writing nothing', async () => {
    repo.findPendingDeletion.mockResolvedValue({ id: USER_ID, pendingDeletionAt: null });

    const res = await app.inject({ method: 'POST', url: RESTORE, headers: COOKIE });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ success: false, error: 'Conflict' });
    expect(repo.clearPendingDeletion).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown User', async () => {
    repo.findPendingDeletion.mockResolvedValue(null);

    const res = await app.inject({ method: 'POST', url: RESTORE, headers: COOKIE });

    expect(res.statusCode).toBe(404);
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('refuses a Registered user who is not an Admin', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);

    const res = await app.inject({ method: 'POST', url: RESTORE, headers: COOKIE });

    expect(res.statusCode).toBe(403);
    expect(repo.clearPendingDeletion).not.toHaveBeenCalled();
  });

  it('refuses an Admin short of two-factor', async () => {
    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);

    const res = await app.inject({ method: 'POST', url: RESTORE, headers: COOKIE });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'TwoFactorRequired' });
    expect(repo.clearPendingDeletion).not.toHaveBeenCalled();
  });
});
