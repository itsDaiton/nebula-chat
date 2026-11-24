import { fromPartial } from '@total-typescript/shoehorn';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunWithSteps } from '@server/modules/run/run.types';
import { createTestApp } from '@server/test/app';
import {
  adminSession,
  adminTrustedDeviceSession,
  ADMIN_USER_ID,
  guestSession,
  registeredSession,
  REGISTERED_USER_ID,
} from '@server/test/session';

// ADR-0008: only the repositories are faked; the gate, validation and error handler are real.
vi.mock('@server/modules/run/run.repository', () => ({
  runRepository: { findOwnedWithSteps: vi.fn(), findAnyWithSteps: vi.fn() },
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
import { runRepository } from '@server/modules/run/run.repository';

const repo = vi.mocked(runRepository);
const audit = vi.mocked(auditRepository);
const mockedGetSession = vi.mocked(auth.api.getSession);

const COOKIE = { cookie: 'better-auth.session_token=abc' };
const RUN_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const STEP_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_USER_ID = '44444444-4444-4444-8444-444444444444';
const RUN = `/api/runs/${RUN_ID}`;

const INTAKE_INPUT = {
  model: 'gpt-4o-mini',
  parameters: { temperature: 0 },
  system: 'Detect the language.',
  human: 'Ahoj',
};

const aStep = (overrides: Record<string, unknown> = {}) => ({
  id: STEP_ID,
  runId: RUN_ID,
  turn: 0,
  phase: 'intake',
  name: 'language',
  parentStepId: null,
  attempt: 1,
  input: { ...INTAKE_INPUT },
  output: { language: 'Czech', englishRestatement: 'Hello' },
  tokens: 120,
  status: 'completed',
  error: null,
  startedAt: new Date('2026-10-27T21:14:00.000Z'),
  finishedAt: new Date('2026-10-27T21:14:00.800Z'),
  ...overrides,
});

const aRun = (overrides: Record<string, unknown> = {}): RunWithSteps =>
  fromPartial({
    id: RUN_ID,
    userId: REGISTERED_USER_ID,
    sessionId: SESSION_ID,
    messageId: '55555555-5555-4555-8555-555555555555',
    status: 'partial',
    brief: {
      language: { language: 'Czech', englishRestatement: 'Hello' },
      session: null,
      missing: ['session'],
    },
    tokensUsed: 38410,
    tokenBudget: 60000,
    createdAt: new Date('2026-10-27T21:13:59.000Z'),
    startedAt: new Date('2026-10-27T21:14:00.000Z'),
    finishedAt: new Date('2026-10-27T21:14:41.200Z'),
    steps: [aStep()],
    ...overrides,
  } as never);

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetSession.mockResolvedValue(registeredSession() as never);
  repo.findOwnedWithSteps.mockResolvedValue(aRun());
  repo.findAnyWithSteps.mockResolvedValue(null);
  audit.insert.mockResolvedValue(undefined);
});

describe('GET /api/runs/:runId', () => {
  it('returns the Run with its Brief and Steps to its owner, without an Audit entry', async () => {
    const res = await app.inject({ method: 'GET', url: RUN, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: RUN_ID,
      sessionId: SESSION_ID,
      status: 'partial',
      brief: {
        language: { language: 'Czech', englishRestatement: 'Hello' },
        session: null,
        missing: ['session'],
      },
      tokensUsed: 38410,
      tokenBudget: 60000,
      createdAt: '2026-10-27T21:13:59.000Z',
      startedAt: '2026-10-27T21:14:00.000Z',
      finishedAt: '2026-10-27T21:14:41.200Z',
      steps: [
        {
          id: STEP_ID,
          turn: 0,
          phase: 'intake',
          name: 'language',
          parentStepId: null,
          attempt: 1,
          input: { ...INTAKE_INPUT },
          output: { language: 'Czech', englishRestatement: 'Hello' },
          tokens: 120,
          status: 'completed',
          error: null,
          startedAt: '2026-10-27T21:14:00.000Z',
          finishedAt: '2026-10-27T21:14:00.800Z',
        },
      ],
    });
    expect(repo.findOwnedWithSteps).toHaveBeenCalledWith(RUN_ID, REGISTERED_USER_ID);
    expect(repo.findAnyWithSteps).not.toHaveBeenCalled();
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('strips Brief and Step fields the schema does not declare', async () => {
    repo.findOwnedWithSteps.mockResolvedValue(
      aRun({
        brief: {
          language: { language: 'Czech', englishRestatement: 'Hello', internal: 'LEAK' },
          session: null,
          missing: [],
          debug: 'LEAK',
        },
        steps: [
          aStep({
            input: { ...INTAKE_INPUT, apiKey: 'LEAK' },
            output: { language: 'Czech', englishRestatement: 'Hello', trace: 'LEAK' },
          }),
          aStep({
            phase: 'tool',
            name: 'web_search',
            input: { query: 'huts', secret: 'LEAK' },
            output: { result: 'ok', raw: 'LEAK' },
          }),
        ],
      }),
    );

    const res = await app.inject({ method: 'GET', url: RUN, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('LEAK');
    expect(res.json().steps[1]).toMatchObject({
      input: { query: 'huts' },
      output: { result: 'ok' },
    });
  });

  it('returns a Run still in flight, with a failed Step carrying its error envelope', async () => {
    const error = { success: false, error: 'Internal', message: 'Something went wrong' };
    repo.findOwnedWithSteps.mockResolvedValue(
      aRun({
        status: 'running',
        brief: null,
        tokenBudget: null,
        finishedAt: null,
        steps: [aStep({ status: 'failed', output: null, tokens: null, error })],
      }),
    );

    const res = await app.inject({ method: 'GET', url: RUN, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'running',
      brief: null,
      tokenBudget: null,
      finishedAt: null,
      steps: [{ status: 'failed', output: null, tokens: null, error }],
    });
  });

  it('answers not-found for an Admin reading a Run that does not exist', async () => {
    mockedGetSession.mockResolvedValue(adminSession() as never);
    repo.findOwnedWithSteps.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: RUN, headers: COOKIE });

    expect(res.statusCode).toBe(404);
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('answers a typed not-found for an unknown Run', async () => {
    repo.findOwnedWithSteps.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: RUN, headers: COOKIE });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
  });

  it("answers the same not-found for someone else's Run, to a User and to a Guest", async () => {
    repo.findOwnedWithSteps.mockResolvedValue(null);
    repo.findAnyWithSteps.mockResolvedValue(aRun({ userId: OTHER_USER_ID }));

    const res = await app.inject({ method: 'GET', url: RUN, headers: COOKIE });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
    expect(res.body).not.toContain('Czech');

    mockedGetSession.mockResolvedValue(guestSession() as never);
    expect((await app.inject({ method: 'GET', url: RUN, headers: COOKIE })).statusCode).toBe(404);
    expect(audit.insert).not.toHaveBeenCalled();
    expect(repo.findAnyWithSteps).not.toHaveBeenCalled();
  });

  it("lets an Admin with two-factor read anyone's Run and writes one Audit entry", async () => {
    mockedGetSession.mockResolvedValue(adminSession() as never);
    repo.findOwnedWithSteps.mockResolvedValue(null);
    repo.findAnyWithSteps.mockResolvedValue(aRun());

    const res = await app.inject({ method: 'GET', url: RUN, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: RUN_ID, steps: [{ id: STEP_ID }] });
    expect(audit.insert).toHaveBeenCalledTimes(1);
    expect(audit.insert).toHaveBeenCalledWith({
      actorType: 'admin',
      actorUserId: ADMIN_USER_ID,
      action: 'run.read',
      targetType: 'run',
      targetId: RUN_ID,
      detail: { userId: REGISTERED_USER_ID, sessionId: SESSION_ID },
    });
  });

  it('does not audit an Admin reading their own Run', async () => {
    mockedGetSession.mockResolvedValue(adminSession() as never);
    repo.findOwnedWithSteps.mockResolvedValue(aRun({ userId: ADMIN_USER_ID }));

    const res = await app.inject({ method: 'GET', url: RUN, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it("hides someone else's Run from an Admin whose auth session skipped two-factor", async () => {
    mockedGetSession.mockResolvedValue(adminTrustedDeviceSession() as never);
    repo.findOwnedWithSteps.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: RUN, headers: COOKIE });

    expect(res.statusCode).toBe(404);
    expect(audit.insert).not.toHaveBeenCalled();
  });

  it('fails the request instead of serving unaudited content when the Audit write fails', async () => {
    mockedGetSession.mockResolvedValue(adminSession() as never);
    repo.findOwnedWithSteps.mockResolvedValue(null);
    repo.findAnyWithSteps.mockResolvedValue(aRun());
    audit.insert.mockRejectedValue(new Error('db down'));

    const res = await app.inject({ method: 'GET', url: RUN, headers: COOKIE });

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('Czech');
  });

  it('rejects a malformed id and a request without a session', async () => {
    expect(
      (await app.inject({ method: 'GET', url: '/api/runs/nope', headers: COOKIE })).statusCode,
    ).toBe(400);

    mockedGetSession.mockResolvedValue(null as never);
    expect((await app.inject({ method: 'GET', url: RUN })).statusCode).toBe(401);
    expect(repo.findOwnedWithSteps).not.toHaveBeenCalled();
  });
});
