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
    findModerationTarget: vi.fn(),
    countOtherActiveAdmins: vi.fn(),
  },
}));

vi.mock('@server/modules/audit/audit.repository', () => ({
  auditRepository: { insert: vi.fn(), list: vi.fn() },
}));

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@server/auth', () => ({
  auth: {
    api: { getSession: vi.fn(), setRole: vi.fn(), banUser: vi.fn(), unbanUser: vi.fn() },
    handler: vi.fn(),
  },
}));

import { auth } from '@server/auth';
import { adminRepository } from '@server/modules/admin/admin.repository';
import { auditRepository } from '@server/modules/audit/audit.repository';

const repo = vi.mocked(adminRepository);
const audit = vi.mocked(auditRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);
const pluginApi = auth.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockedSetRole = pluginApi.setRole!;
const mockedBanUser = pluginApi.banUser!;
const mockedUnbanUser = pluginApi.unbanUser!;

const aTarget = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  emailVerified: true,
  isAnonymous: false,
  banned: false,
  banExpires: null,
  banReason: null,
  role: 'user',
  ...overrides,
});

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
  repo.findModerationTarget.mockResolvedValue(fromPartial(aTarget()));
  repo.countOtherActiveAdmins.mockResolvedValue(1);
  mockedSetRole.mockResolvedValue(undefined);
  mockedBanUser.mockResolvedValue(undefined);
  mockedUnbanUser.mockResolvedValue(undefined);
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

describe('POST /api/admin/users/:id/role', () => {
  const ROLE = `${ROUTE}/${USER_ID}/role`;
  const send = (payload: unknown) =>
    app.inject({ method: 'POST', url: ROLE, headers: COOKIE, payload: payload as object });

  it('grants Admin to a verified Registered user through better-auth, with one Audit entry', async () => {
    const res = await send({ role: 'admin' });

    expect(res.statusCode).toBe(204);
    expect(mockedSetRole).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: USER_ID, role: 'admin' } }),
    );
    expect(audit.insert).toHaveBeenCalledTimes(1);
    expect(audit.insert).toHaveBeenCalledWith({
      actorType: 'admin',
      actorUserId: ADMIN_USER_ID,
      action: 'admin.granted',
      targetType: 'user',
      targetId: USER_ID,
      detail: { role: { from: 'user', to: 'admin' } },
    });
  });

  it.each([
    ['a Guest', { isAnonymous: true }],
    ['an unverified user', { emailVerified: false }],
    ['a banned user', { banned: true }],
  ])('refuses %s with NotEligibleForAdmin', async (_label, overrides) => {
    repo.findModerationTarget.mockResolvedValue(fromPartial(aTarget(overrides)));

    const res = await send({ role: 'admin' });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ success: false, error: 'NotEligibleForAdmin' });
    expect(mockedSetRole).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('lets a user whose ban ran out become an Admin', async () => {
    repo.findModerationTarget.mockResolvedValue(
      fromPartial(aTarget({ banned: true, banExpires: new Date('2020-01-01T00:00:00.000Z') })),
    );

    const res = await send({ role: 'admin' });

    expect(res.statusCode).toBe(204);
  });

  it('answers a typed conflict when the user is already an Admin', async () => {
    repo.findModerationTarget.mockResolvedValue(fromPartial(aTarget({ role: 'admin' })));

    const res = await send({ role: 'admin' });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'Conflict' });
    expect(mockedSetRole).not.toHaveBeenCalled();
  });

  it('revokes an Admin while another remains', async () => {
    repo.findModerationTarget.mockResolvedValue(fromPartial(aTarget({ role: 'admin' })));

    const res = await send({ role: 'user' });

    expect(res.statusCode).toBe(204);
    expect(repo.countOtherActiveAdmins).toHaveBeenCalledWith(USER_ID);
    expect(mockedSetRole).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: USER_ID, role: 'user' } }),
    );
    expect(audit.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.role_changed',
        detail: { role: { from: 'admin', to: 'user' } },
      }),
    );
  });

  it('refuses to revoke the last Admin', async () => {
    repo.findModerationTarget.mockResolvedValue(fromPartial(aTarget({ role: 'admin' })));
    repo.countOtherActiveAdmins.mockResolvedValue(0);

    const res = await send({ role: 'user' });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'LastAdmin' });
    expect(mockedSetRole).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('answers a typed conflict when revoking a user who is not an Admin', async () => {
    const res = await send({ role: 'user' });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'Conflict' });
  });

  it('answers 404 for an unknown User', async () => {
    repo.findModerationTarget.mockResolvedValue(null);

    const res = await send({ role: 'admin' });

    expect(res.statusCode).toBe(404);
  });

  it('rejects a role outside admin and user', async () => {
    const res = await send({ role: 'root' });

    expect(res.statusCode).toBe(400);
    expect(mockedSetRole).not.toHaveBeenCalled();
  });

  it.each([
    ['a Registered user', () => registeredSession(), 'Forbidden'],
    ['an Admin short of two-factor', () => adminWithout2FASession(), 'TwoFactorRequired'],
  ])('refuses %s', async (_label, session, error) => {
    mockedGetSession.mockResolvedValue(session() as never);

    const res = await send({ role: 'admin' });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error });
    expect(mockedSetRole).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/users/:id/ban', () => {
  const BAN = `${ROUTE}/${USER_ID}/ban`;
  const send = (payload: unknown) =>
    app.inject({ method: 'POST', url: BAN, headers: COOKIE, payload: payload as object });

  it('bans through better-auth with the reason and seconds until the end, and audits once', async () => {
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString();

    const res = await send({ reason: 'spam', expiresAt });

    expect(res.statusCode).toBe(204);
    expect(mockedBanUser).toHaveBeenCalledTimes(1);
    const { body } = mockedBanUser.mock.calls[0]?.[0] as { body: Record<string, unknown> };
    expect(body).toMatchObject({ userId: USER_ID, banReason: 'spam' });
    expect(body.banExpiresIn).toBeGreaterThan(3590);
    expect(body.banExpiresIn).toBeLessThanOrEqual(3600);
    expect(audit.insert).toHaveBeenCalledTimes(1);
    expect(audit.insert).toHaveBeenCalledWith({
      actorType: 'admin',
      actorUserId: ADMIN_USER_ID,
      action: 'user.banned',
      targetType: 'user',
      targetId: USER_ID,
      detail: { reason: 'spam', expiresAt },
    });
  });

  it('bans with no end when no end time is given', async () => {
    const res = await send({ reason: 'abuse' });

    expect(res.statusCode).toBe(204);
    expect(mockedBanUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: USER_ID, banReason: 'abuse' } }),
    );
    expect(audit.insert).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { reason: 'abuse', expiresAt: null } }),
    );
  });

  it('refuses to ban the last Admin', async () => {
    repo.findModerationTarget.mockResolvedValue(fromPartial(aTarget({ role: 'admin' })));
    repo.countOtherActiveAdmins.mockResolvedValue(0);

    const res = await send({ reason: 'spam' });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'LastAdmin' });
    expect(mockedBanUser).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('bans an Admin while another remains', async () => {
    repo.findModerationTarget.mockResolvedValue(fromPartial(aTarget({ role: 'admin' })));

    const res = await send({ reason: 'spam' });

    expect(res.statusCode).toBe(204);
  });

  it('refuses an Admin banning themselves', async () => {
    repo.findModerationTarget.mockResolvedValue(fromPartial(aTarget({ id: ADMIN_USER_ID })));

    const res = await app.inject({
      method: 'POST',
      url: `${ROUTE}/${ADMIN_USER_ID}/ban`,
      headers: COOKIE,
      payload: { reason: 'spam' },
    });

    expect(res.statusCode).toBe(400);
    expect(mockedBanUser).not.toHaveBeenCalled();
  });

  it('answers a typed conflict for a User who is already banned', async () => {
    repo.findModerationTarget.mockResolvedValue(fromPartial(aTarget({ banned: true })));

    const res = await send({ reason: 'spam' });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'Conflict' });
  });

  it.each([
    ['no reason', {}],
    ['an empty reason', { reason: '' }],
    ['an end time in the past', { reason: 'spam', expiresAt: '2020-01-01T00:00:00.000Z' }],
    ['an end time that is not a date', { reason: 'spam', expiresAt: 'soon' }],
  ])('rejects %s', async (_label, payload) => {
    const res = await send(payload);

    expect(res.statusCode).toBe(400);
    expect(mockedBanUser).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown User', async () => {
    repo.findModerationTarget.mockResolvedValue(null);

    const res = await send({ reason: 'spam' });

    expect(res.statusCode).toBe(404);
  });

  it('refuses an Admin short of two-factor', async () => {
    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);

    const res = await send({ reason: 'spam' });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'TwoFactorRequired' });
    expect(mockedBanUser).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/users/:id/unban', () => {
  const UNBAN = `${ROUTE}/${USER_ID}/unban`;

  it('unbans through better-auth and audits once', async () => {
    repo.findModerationTarget.mockResolvedValue(
      fromPartial(aTarget({ banned: true, banReason: 'spam' })),
    );

    const res = await app.inject({ method: 'POST', url: UNBAN, headers: COOKIE });

    expect(res.statusCode).toBe(204);
    expect(mockedUnbanUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: USER_ID } }),
    );
    expect(audit.insert).toHaveBeenCalledTimes(1);
    expect(audit.insert).toHaveBeenCalledWith({
      actorType: 'admin',
      actorUserId: ADMIN_USER_ID,
      action: 'user.unbanned',
      targetType: 'user',
      targetId: USER_ID,
      detail: { reason: 'spam' },
    });
  });

  it('answers a typed conflict for a User who is not banned', async () => {
    const res = await app.inject({ method: 'POST', url: UNBAN, headers: COOKIE });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'Conflict' });
    expect(mockedUnbanUser).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('refuses an Admin short of two-factor', async () => {
    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);

    const res = await app.inject({ method: 'POST', url: UNBAN, headers: COOKIE });

    expect(res.statusCode).toBe(403);
    expect(mockedUnbanUser).not.toHaveBeenCalled();
  });
});
