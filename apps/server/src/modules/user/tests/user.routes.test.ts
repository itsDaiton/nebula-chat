import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';
import {
  adminSession,
  adminWithout2FASession,
  ADMIN_USER_ID,
  registeredSession,
} from '@server/test/session';

// ADR-0008: only the repositories are faked; the gate, validation and error handler are real.
vi.mock('@server/modules/user/user.repository', () => ({
  userRepository: { findPendingDeletion: vi.fn(), clearPendingDeletion: vi.fn() },
}));

vi.mock('@server/modules/audit/audit.repository', () => ({
  auditRepository: { insert: vi.fn(), list: vi.fn() },
}));

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { auth } from '@server/auth';
import { auditRepository } from '@server/modules/audit/audit.repository';
import { userRepository } from '@server/modules/user/user.repository';

const repo = vi.mocked(userRepository);
const audit = vi.mocked(auditRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const USER_ID = '44444444-4444-4444-8444-444444444444';
const ROUTE = `/api/admin/users/${USER_ID}/restore`;
const COOKIE = { cookie: 'better-auth.session_token=abc' };
const PENDING_AT = new Date('2026-10-01T00:00:00.000Z');

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
  repo.findPendingDeletion.mockResolvedValue({ id: USER_ID, pendingDeletionAt: PENDING_AT });
  repo.clearPendingDeletion.mockResolvedValue(undefined);
  audit.insert.mockResolvedValue(undefined);
});

describe('POST /api/admin/users/:id/restore', () => {
  it('restores a pending User and records the Admin in the Audit log', async () => {
    const res = await app.inject({ method: 'POST', url: ROUTE, headers: COOKIE });

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

    const res = await app.inject({ method: 'POST', url: ROUTE, headers: COOKIE });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ success: false, error: 'Conflict' });
    expect(repo.clearPendingDeletion).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown User', async () => {
    repo.findPendingDeletion.mockResolvedValue(null);

    const res = await app.inject({ method: 'POST', url: ROUTE, headers: COOKIE });

    expect(res.statusCode).toBe(404);
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('rejects an id that is not a UUID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users/not-a-uuid/restore',
      headers: COOKIE,
    });

    expect(res.statusCode).toBe(400);
  });

  it('refuses a request with no session', async () => {
    mockedGetSession.mockResolvedValue(null as never);

    const res = await app.inject({ method: 'POST', url: ROUTE });

    expect(res.statusCode).toBe(401);
  });

  it('refuses a Registered user who is not an Admin', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);

    const res = await app.inject({ method: 'POST', url: ROUTE, headers: COOKIE });

    expect(res.statusCode).toBe(403);
    expect(repo.clearPendingDeletion).not.toHaveBeenCalled();
  });

  it('refuses an Admin without two-factor', async () => {
    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);

    const res = await app.inject({ method: 'POST', url: ROUTE, headers: COOKIE });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'TwoFactorRequired' });
    expect(repo.clearPendingDeletion).not.toHaveBeenCalled();
  });
});
