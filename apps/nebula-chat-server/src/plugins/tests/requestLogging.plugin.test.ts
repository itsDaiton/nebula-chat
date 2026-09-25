import { fromPartial } from '@total-typescript/shoehorn';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@backend/test/app';
import { captureLogger, eventLines, LEVEL } from '@backend/test/logCapture';
import { guestSession, registeredSession, REGISTERED_USER_ID } from '@backend/test/session';

// ADR-0008: the repository is the boundary to Postgres. Everything between it
// and the HTTP edge — routing, validation, the gate, the error handler and the
// request-logging hooks under test — is real.
vi.mock('@backend/modules/conversation/conversation.repository', () => ({
  conversationRepository: { create: vi.fn(), findById: vi.fn(), findAll: vi.fn(), search: vi.fn() },
}));

vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@backend/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

import { auth } from '@backend/auth';
import { conversationRepository } from '@backend/modules/conversation/conversation.repository';

const repo = vi.mocked(conversationRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

const { logger, lines } = captureLogger();
let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp({ logger });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetSession.mockResolvedValue(registeredSession() as never);
  lines.length = 0;
});

/** Lines at `info` or above — what production (LOG_LEVEL=info) would show. */
const atInfo = () => lines.filter((line) => line.level >= LEVEL.info);

describe('http.request.completed', () => {
  it('writes exactly one info line per request, with the request attributes', async () => {
    await app.inject({ method: 'GET', url: '/health' });

    expect(atInfo()).toEqual([
      expect.objectContaining({
        level: LEVEL.info,
        'event.name': 'http.request.completed',
        'nebula.component': 'http',
        'http.request.method': 'GET',
        'url.path': '/health',
        'http.route': '/health',
        'http.response.status_code': 200,
        'http.request.id': expect.any(String),
        'nebula.duration_ms': expect.any(Number),
      }),
    ]);
  });

  it('keeps the query string out of url.path', async () => {
    await app.inject({ method: 'GET', url: '/health?probe=liveness' });

    expect(eventLines(lines, 'http.request.completed')[0]?.['url.path']).toBe('/health');
  });

  it('shares one request id between the received and completed lines', async () => {
    await app.inject({ method: 'GET', url: '/health' });

    const [received] = eventLines(lines, 'http.request.received');
    const [completed] = eventLines(lines, 'http.request.completed');
    expect(received?.['http.request.id']).toBe(completed?.['http.request.id']);
  });

  it("no longer writes Fastify's built-in request lines", async () => {
    await app.inject({ method: 'GET', url: '/health' });

    const messages = lines.map((line) => line.msg);
    expect(messages).not.toContain('incoming request');
    expect(messages).not.toContain('request completed');
  });
});

describe('http.request.received', () => {
  it('is written at debug only', async () => {
    await app.inject({ method: 'GET', url: '/health' });

    expect(eventLines(lines, 'http.request.received')).toEqual([
      expect.objectContaining({
        level: LEVEL.debug,
        'http.request.method': 'GET',
        'url.path': '/health',
      }),
    ]);
  });
});

describe('a 4xx', () => {
  it('writes no line of its own and names its error.type on the completion line', async () => {
    repo.findById.mockResolvedValue(fromPartial(null));

    const res = await app.inject({ method: 'GET', url: `/api/conversations/${CONVERSATION_ID}` });

    expect(res.statusCode).toBe(404);
    expect(atInfo()).toEqual([
      expect.objectContaining({
        'event.name': 'http.request.completed',
        'http.response.status_code': 404,
        'error.type': 'NotFound',
      }),
    ]);
  });

  it('names a schema-validation failure Validation', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/conversations/not-a-uuid' });

    expect(res.statusCode).toBe(400);
    expect(atInfo()).toEqual([
      expect.objectContaining({ 'http.response.status_code': 400, 'error.type': 'Validation' }),
    ]);
  });

  it('names an unknown route NotFound', async () => {
    const res = await app.inject({ method: 'GET', url: '/no/such/route' });

    expect(res.statusCode).toBe(404);
    expect(atInfo()).toEqual([
      expect.objectContaining({
        'event.name': 'http.request.completed',
        'url.path': '/no/such/route',
        'error.type': 'NotFound',
      }),
    ]);
  });
});

describe('a 5xx', () => {
  it('writes exactly one error line, with the stack, and completes as Internal', async () => {
    repo.findAll.mockRejectedValue(
      new TypeError("Cannot read properties of undefined (reading 'id')"),
    );

    const res = await app.inject({ method: 'GET', url: '/api/conversations' });

    expect(res.statusCode).toBe(500);
    const errors = lines.filter((line) => line.level >= LEVEL.error);
    expect(errors).toEqual([
      expect.objectContaining({
        'event.name': 'http.request.failed',
        'error.type': 'Internal',
        err: expect.objectContaining({
          type: 'TypeError',
          stack: expect.stringContaining('TypeError'),
        }),
      }),
    ]);
    expect(eventLines(lines, 'http.request.completed')).toEqual([
      expect.objectContaining({ 'http.response.status_code': 500, 'error.type': 'Internal' }),
    ]);
  });
});

describe('the User', () => {
  it.each([
    ['a Registered user', registeredSession, 'registered'],
    ['a Guest', guestSession, 'guest'],
  ] as const)('is bound on every line after the gate for %s', async (_label, session, kind) => {
    mockedGetSession.mockResolvedValue(session() as never);
    repo.findById.mockResolvedValue(fromPartial(null));

    await app.inject({ method: 'GET', url: `/api/conversations/${CONVERSATION_ID}` });

    expect(eventLines(lines, 'http.request.completed')).toEqual([
      expect.objectContaining({ 'user.id': expect.any(String), 'nebula.user.kind': kind }),
    ]);
  });

  it('carries the session user id, not a placeholder', async () => {
    repo.findById.mockResolvedValue(fromPartial(null));

    await app.inject({ method: 'GET', url: `/api/conversations/${CONVERSATION_ID}` });

    expect(eventLines(lines, 'http.request.completed')[0]?.['user.id']).toBe(REGISTERED_USER_ID);
  });

  it('is absent from a request that never passed a gate', async () => {
    await app.inject({ method: 'GET', url: '/health' });

    expect(eventLines(lines, 'http.request.completed')[0]).not.toHaveProperty('user.id');
  });
});

describe('sensitive request data', () => {
  it('logs no cookie, Authorization value or request body', async () => {
    repo.create.mockResolvedValue(
      fromPartial({ id: CONVERSATION_ID, title: 'x', createdAt: new Date('2026-01-01') }),
    );

    await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: {
        cookie: 'better-auth.session_token=SECRET-COOKIE',
        authorization: 'Bearer SECRET-TOKEN',
      },
      payload: { title: 'SECRET-BODY' },
    });

    const logged = JSON.stringify(lines);
    expect(lines.length).toBeGreaterThan(0);
    expect(logged).not.toContain('SECRET-COOKIE');
    expect(logged).not.toContain('SECRET-TOKEN');
    expect(logged).not.toContain('SECRET-BODY');
  });
});
