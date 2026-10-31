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
  unverifiedAdminSession,
} from '@server/test/session';

// ADR-0008: only the repository layer is faked; the gate, validation and error handler are real.
vi.mock('@server/modules/audit/audit.repository', () => ({
  auditRepository: { insert: vi.fn(), list: vi.fn() },
}));

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { auth } from '@server/auth';
import { auditRepository } from '@server/modules/audit/audit.repository';

const repo = vi.mocked(auditRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const ROUTE = '/api/admin/audit';
const COOKIE = { cookie: 'better-auth.session_token=abc' };
const ENTRY_ID = '22222222-2222-4222-8222-222222222222';
const TARGET_ID = '33333333-3333-4333-8333-333333333333';

const anEntry = {
  id: ENTRY_ID,
  actorType: 'operator' as const,
  actorUserId: null,
  action: 'admin.granted' as const,
  targetType: 'user',
  targetId: TARGET_ID,
  detail: { role: { from: 'user', to: 'admin' } },
  createdAt: new Date('2026-10-30T12:00:00.000Z'),
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
  repo.list.mockResolvedValue(
    fromPartial({ entries: [anEntry], nextCursor: ENTRY_ID, hasMore: true }),
  );
});

describe('GET /api/admin/audit', () => {
  it('answers an Admin with a page of entries and the cursor to the next', async () => {
    const res = await app.inject({ method: 'GET', url: ROUTE, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      entries: [{ ...anEntry, createdAt: '2026-10-30T12:00:00.000Z' }],
      nextCursor: ENTRY_ID,
      hasMore: true,
    });
    expect(repo.list).toHaveBeenCalledWith({}, 10, undefined);
  });

  it('filters by actor, action, target and time range, from a cursor', async () => {
    const query = new URLSearchParams({
      actorType: 'admin',
      actorUserId: ADMIN_USER_ID,
      action: 'user.banned',
      targetType: 'user',
      targetId: TARGET_ID,
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-31T00:00:00.000Z',
      limit: '5',
      cursor: ENTRY_ID,
    });

    const res = await app.inject({ method: 'GET', url: `${ROUTE}?${query}`, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(repo.list).toHaveBeenCalledWith(
      {
        actorType: 'admin',
        actorUserId: ADMIN_USER_ID,
        action: 'user.banned',
        targetType: 'user',
        targetId: TARGET_ID,
        from: new Date('2026-10-01T00:00:00.000Z'),
        to: new Date('2026-10-31T00:00:00.000Z'),
      },
      5,
      ENTRY_ID,
    );
  });

  it.each([
    ['an unknown action', 'action=user.deleted'],
    ['an unknown actor type', 'actorType=robot'],
    ['a time that is not ISO 8601', 'from=yesterday'],
    ['a cursor that is not an entry id', 'cursor=abc'],
    ['a page past 100', 'limit=101'],
  ])('rejects %s', async (_case, query) => {
    const res = await app.inject({ method: 'GET', url: `${ROUTE}?${query}`, headers: COOKIE });

    expect(res.statusCode).toBe(400);
    expect(repo.list).not.toHaveBeenCalled();
  });

  it.each([
    ['an Admin who never enrolled in two-factor', adminWithout2FASession],
    ['an Admin on a trusted-device auth session', adminTrustedDeviceSession],
  ])('asks %s for two-factor', async (_who, session) => {
    mockedGetSession.mockResolvedValue(session() as never);

    const res = await app.inject({ method: 'GET', url: ROUTE, headers: COOKIE });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: 'TwoFactorRequired' });
    expect(repo.list).not.toHaveBeenCalled();
  });

  it.each([
    ['a Registered user', registeredSession],
    ['a Guest', guestSession],
    ['a banned Admin', bannedSession],
    ['an Admin whose email is unverified', unverifiedAdminSession],
  ])('answers Forbidden to %s', async (_who, session) => {
    mockedGetSession.mockResolvedValue(session() as never);

    const res = await app.inject({ method: 'GET', url: ROUTE, headers: COOKIE });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: 'Forbidden' });
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('answers Unauthorized without a session', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: ROUTE });

    expect(res.statusCode).toBe(401);
  });
});
