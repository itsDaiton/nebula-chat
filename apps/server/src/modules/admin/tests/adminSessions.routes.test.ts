import { fromPartial } from '@total-typescript/shoehorn';
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
vi.mock('@server/modules/admin/admin.repository', () => ({
  adminRepository: {
    findModerationTarget: vi.fn(),
    listUserSessions: vi.fn(),
    findSession: vi.fn(),
  },
}));

vi.mock('@server/modules/message/message.repository', () => ({
  messageRepository: { findAll: vi.fn() },
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
import { messageRepository } from '@server/modules/message/message.repository';

const repo = vi.mocked(adminRepository);
const messages = vi.mocked(messageRepository);
const audit = vi.mocked(auditRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const COOKIE = { cookie: 'better-auth.session_token=abc' };
const USER_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_ID = '55555555-5555-4555-8555-555555555555';
const MESSAGE_ID = '66666666-6666-4666-8666-666666666666';
const CREATED_AT = new Date('2026-09-01T08:00:00.000Z');
const UPDATED_AT = new Date('2026-09-02T09:00:00.000Z');
const USER_SESSIONS = `/api/admin/users/${USER_ID}/sessions`;
const SESSION = `/api/admin/sessions/${SESSION_ID}`;

const aSession = (overrides: Record<string, unknown> = {}) => ({
  id: SESSION_ID,
  userId: USER_ID,
  title: 'Planning',
  model: 'gpt-4o-mini',
  archived: false,
  messageCount: 2,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  ...overrides,
});

const aMessage = (overrides: Record<string, unknown> = {}) => ({
  id: MESSAGE_ID,
  sessionId: SESSION_ID,
  content: 'Hello',
  role: 'user' as const,
  tokenCount: null,
  cached: false,
  model: null,
  estimatedCostUsd: null,
  runId: null,
  contextTokens: null,
  contextMessages: null,
  createdAt: CREATED_AT,
  ...overrides,
});

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
  repo.findModerationTarget.mockResolvedValue(fromPartial({ id: USER_ID }));
  repo.listUserSessions.mockResolvedValue({
    sessions: [aSession({ archived: true })],
    nextCursor: SESSION_ID,
    hasMore: true,
  } as never);
  repo.findSession.mockResolvedValue(fromPartial(aSession()));
  messages.findAll.mockResolvedValue(fromPartial([aMessage()]));
  audit.insert.mockResolvedValue(undefined);
});

describe('GET /api/admin/users/:id/sessions', () => {
  it('lists the Sessions with archived marked, and writes no Audit entry', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${USER_SESSIONS}?limit=5`,
      headers: COOKIE,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      sessions: [
        {
          id: SESSION_ID,
          title: 'Planning',
          model: 'gpt-4o-mini',
          archived: true,
          messageCount: 2,
          createdAt: '2026-09-01T08:00:00.000Z',
          updatedAt: '2026-09-02T09:00:00.000Z',
        },
      ],
      nextCursor: SESSION_ID,
      hasMore: true,
    });
    expect(repo.listUserSessions).toHaveBeenCalledWith(USER_ID, 5, undefined);
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('returns a typed not-found for an unknown User', async () => {
    repo.findModerationTarget.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: USER_SESSIONS, headers: COOKIE });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
    expect(repo.listUserSessions).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('rejects a malformed id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users/nope/sessions',
      headers: COOKIE,
    });

    expect(res.statusCode).toBe(400);
  });

  it('refuses a non-Admin and an Admin without two-factor', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    expect(
      (await app.inject({ method: 'GET', url: USER_SESSIONS, headers: COOKIE })).statusCode,
    ).toBe(403);

    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);
    const res = await app.inject({ method: 'GET', url: USER_SESSIONS, headers: COOKIE });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'TwoFactorRequired' });
    expect(repo.listUserSessions).not.toHaveBeenCalled();
  });

  it('refuses a request without a session', async () => {
    mockedGetSession.mockResolvedValue(null as never);

    const res = await app.inject({ method: 'GET', url: USER_SESSIONS });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/admin/sessions/:id', () => {
  it('returns the Session with its Messages and writes one Audit entry for the Admin', async () => {
    const res = await app.inject({ method: 'GET', url: SESSION, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: SESSION_ID,
      userId: USER_ID,
      title: 'Planning',
      archived: false,
      messages: [{ id: MESSAGE_ID, content: 'Hello', role: 'user' }],
    });
    expect(messages.findAll).toHaveBeenCalledWith(USER_ID, SESSION_ID);
    expect(audit.insert).toHaveBeenCalledTimes(1);
    expect(audit.insert).toHaveBeenCalledWith({
      actorType: 'admin',
      actorUserId: ADMIN_USER_ID,
      action: 'session.read',
      targetType: 'session',
      targetId: SESSION_ID,
      detail: { userId: USER_ID },
    });
  });

  it('returns a typed not-found and writes no Audit entry for an unknown Session', async () => {
    repo.findSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: SESSION, headers: COOKIE });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('fails the request instead of serving unaudited content when the Audit write fails', async () => {
    audit.insert.mockRejectedValue(new Error('db down'));

    const res = await app.inject({ method: 'GET', url: SESSION, headers: COOKIE });

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('Hello');
  });

  it('writes no Audit entry when reading the Messages fails', async () => {
    messages.findAll.mockRejectedValue(new Error('db down'));

    const res = await app.inject({ method: 'GET', url: SESSION, headers: COOKIE });

    expect(res.statusCode).toBe(500);
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('refuses a non-Admin and an Admin without two-factor, with no read and no Audit entry', async () => {
    mockedGetSession.mockResolvedValue(registeredSession() as never);
    expect((await app.inject({ method: 'GET', url: SESSION, headers: COOKIE })).statusCode).toBe(
      403,
    );

    mockedGetSession.mockResolvedValue(adminWithout2FASession() as never);
    expect((await app.inject({ method: 'GET', url: SESSION, headers: COOKIE })).statusCode).toBe(
      403,
    );

    expect(repo.findSession).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });
});
