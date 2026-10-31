import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@server/test/app';

// ADR-0008: the repositories are the boundary (Postgres, and better-auth for the role write); the rest is real.
vi.mock('@server/modules/admin/admin.repository', () => ({
  adminRepository: { findUserByEmail: vi.fn(), listAdmins: vi.fn(), setRole: vi.fn() },
}));

vi.mock('@server/modules/audit/audit.repository', () => ({
  auditRepository: { insert: vi.fn(), list: vi.fn() },
}));

vi.mock('@server/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@server/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { env } from '@server/env';
import { adminRepository } from '@server/modules/admin/admin.repository';
import { auditRepository } from '@server/modules/audit/audit.repository';

const repo = vi.mocked(adminRepository);
const audit = vi.mocked(auditRepository);

const ROUTE = '/api/internal/admins';
const OPERATOR = { authorization: `Bearer ${env.OPERATOR_TOKEN}` };
const USER_ID = '44444444-4444-4444-8444-444444444444';
const CREATED_AT = new Date('2026-09-01T08:00:00.000Z');

const aUser = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  email: 'ada@example.com',
  name: 'Ada',
  emailVerified: true,
  isAnonymous: false,
  banned: false,
  role: 'user',
  twoFactorEnabled: false,
  createdAt: CREATED_AT,
  ...overrides,
});

const anAdminBody = {
  id: USER_ID,
  email: 'ada@example.com',
  name: 'Ada',
  twoFactorEnabled: false,
  createdAt: '2026-09-01T08:00:00.000Z',
};

/** Runs `fn` with no operator token configured, as a deployment that never set one. */
const withoutOperatorToken = async (fn: () => Promise<void>) => {
  const token = env.OPERATOR_TOKEN;
  env.OPERATOR_TOKEN = undefined;
  try {
    await fn();
  } finally {
    env.OPERATOR_TOKEN = token;
  }
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
  repo.setRole.mockResolvedValue(undefined);
  audit.insert.mockResolvedValue(undefined);
});

describe('POST /api/internal/admins', () => {
  const grant = (payload: object, headers: Record<string, string> = OPERATOR) =>
    app.inject({ method: 'POST', url: ROUTE, headers, payload });

  it('grants Admin to a verified Registered user and audits it with the Operator as actor', async () => {
    repo.findUserByEmail.mockResolvedValue(aUser());

    const res = await grant({ email: 'ada@example.com' });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(anAdminBody);
    expect(repo.setRole).toHaveBeenCalledExactlyOnceWith(USER_ID, 'admin');
    expect(audit.insert).toHaveBeenCalledExactlyOnceWith({
      actorType: 'operator',
      action: 'admin.granted',
      targetType: 'user',
      targetId: USER_ID,
      detail: { role: { from: 'user', to: 'admin' } },
    });
  });

  it('finds the user whatever the case of the email', async () => {
    repo.findUserByEmail.mockResolvedValue(aUser());

    await grant({ email: 'Ada@Example.COM' });

    expect(repo.findUserByEmail).toHaveBeenCalledWith('ada@example.com');
  });

  it('answers NotFound for an email no user has', async () => {
    repo.findUserByEmail.mockResolvedValue(null);

    const res = await grant({ email: 'nobody@example.com' });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
    expect(repo.setRole).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it.each([
    ['a Guest', { isAnonymous: true }],
    ['an unverified user', { emailVerified: false }],
    ['a banned user', { banned: true }],
  ])('refuses %s with Validation and grants nothing', async (_who, overrides) => {
    repo.findUserByEmail.mockResolvedValue(aUser(overrides));

    const res = await grant({ email: 'ada@example.com' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, error: 'Validation' });
    expect(repo.setRole).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('answers Conflict for someone already an Admin, and audits nothing', async () => {
    repo.findUserByEmail.mockResolvedValue(aUser({ role: 'admin' }));

    const res = await grant({ email: 'ada@example.com' });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ success: false, error: 'Conflict' });
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('writes no Audit entry when the role write fails', async () => {
    repo.findUserByEmail.mockResolvedValue(aUser());
    repo.setRole.mockRejectedValue(new Error('db down'));

    const res = await grant({ email: 'ada@example.com' });

    expect(res.statusCode).toBe(500);
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('rejects a body without a valid email', async () => {
    const res = await grant({ email: 'not-an-email' });

    expect(res.statusCode).toBe(400);
    expect(repo.findUserByEmail).not.toHaveBeenCalled();
  });

  it('answers Forbidden to a wrong operator token, before reading the body', async () => {
    const res = await grant({ email: 'not-an-email' }, { authorization: 'Bearer not-the-token' });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: 'Forbidden' });
  });

  it('answers Not Found while no operator token is configured', async () => {
    await withoutOperatorToken(async () => {
      const res = await grant({ email: 'ada@example.com' });

      expect(res.statusCode).toBe(404);
      expect(repo.findUserByEmail).not.toHaveBeenCalled();
    });
  });
});

describe('DELETE /api/internal/admins/:email', () => {
  const revoke = (email: string, headers: Record<string, string> = OPERATOR) =>
    app.inject({ method: 'DELETE', url: `${ROUTE}/${encodeURIComponent(email)}`, headers });

  it('revokes Admin and audits it as a role change by the Operator', async () => {
    repo.findUserByEmail.mockResolvedValue(aUser({ role: 'admin' }));

    const res = await revoke('ada@example.com');

    expect(res.statusCode).toBe(204);
    expect(repo.setRole).toHaveBeenCalledExactlyOnceWith(USER_ID, 'user');
    expect(audit.insert).toHaveBeenCalledExactlyOnceWith({
      actorType: 'operator',
      action: 'user.role_changed',
      targetType: 'user',
      targetId: USER_ID,
      detail: { role: { from: 'admin', to: 'user' } },
    });
  });

  it('answers NotFound for an email no user has', async () => {
    repo.findUserByEmail.mockResolvedValue(null);

    const res = await revoke('nobody@example.com');

    expect(res.statusCode).toBe(404);
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('answers Conflict for someone who is not an Admin, and audits nothing', async () => {
    repo.findUserByEmail.mockResolvedValue(aUser());

    const res = await revoke('ada@example.com');

    expect(res.statusCode).toBe(409);
    expect(repo.setRole).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('answers Forbidden to a wrong operator token', async () => {
    const res = await revoke('ada@example.com', { authorization: 'Bearer not-the-token' });

    expect(res.statusCode).toBe(403);
  });

  it('answers Not Found while no operator token is configured', async () => {
    await withoutOperatorToken(async () => {
      const res = await revoke('ada@example.com');

      expect(res.statusCode).toBe(404);
      expect(repo.findUserByEmail).not.toHaveBeenCalled();
    });
  });
});

describe('GET /api/internal/admins', () => {
  it('lists every Admin', async () => {
    repo.listAdmins.mockResolvedValue([aUser({ role: 'admin', twoFactorEnabled: true })]);

    const res = await app.inject({ method: 'GET', url: ROUTE, headers: OPERATOR });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{ ...anAdminBody, twoFactorEnabled: true }]);
  });

  it('answers Forbidden to a wrong operator token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: ROUTE,
      headers: { authorization: 'Bearer not-the-token' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('answers Not Found while no operator token is configured', async () => {
    await withoutOperatorToken(async () => {
      const res = await app.inject({ method: 'GET', url: ROUTE, headers: OPERATOR });

      expect(res.statusCode).toBe(404);
    });
  });
});
