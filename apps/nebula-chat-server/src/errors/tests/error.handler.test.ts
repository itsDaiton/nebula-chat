import type { FastifyReply, FastifyRequest } from 'fastify';
import { validatorCompiler } from 'fastify-type-provider-zod';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  AppError,
  errorEnvelopeSchema,
  GENERIC_ERROR_MESSAGE,
  MessageAllowanceReachedError,
  NotFoundError,
} from '@nebula-chat/errors';
import type { ErrorEnvelope } from '@nebula-chat/errors';
import { errorHandler } from '@backend/errors/error.handler';

/** Minimal reply double capturing the status/body the handler chose. */
const createReply = () => {
  const sent: { status?: number; body?: ErrorEnvelope } = {};
  const reply = {
    log: { error: vi.fn() },
    status(code: number) {
      sent.status = code;
      return this;
    },
    send(body: ErrorEnvelope) {
      sent.body = body;
      return this;
    },
  };
  return { reply: reply as unknown as FastifyReply, sent, logError: reply.log.error };
};

const request = {} as FastifyRequest;

const handle = (err: Error) => {
  const { reply, sent } = createReply();
  errorHandler(err, request, reply);
  return sent;
};

/** Shapes a node-postgres style error, which carries a `code` but is not an AppError. */
const pgError = (code: string) => Object.assign(new Error('db said no'), { code });

/**
 * A genuine Fastify schema-validation error: the validation entries come from
 * the real Zod validator compiler, exactly as Fastify attaches them.
 */
const validationError = () => {
  const validate = validatorCompiler({
    schema: z.object({ title: z.string() }),
    method: 'POST',
    url: '/x',
    httpPart: 'body',
  });
  const result = validate({}) as { error: unknown };
  return Object.assign(new Error('body/title Invalid input'), {
    validation: result.error,
    statusCode: 400,
    code: 'FST_ERR_VALIDATION',
  });
};

describe('errorHandler', () => {
  it('logs every error it handles', () => {
    const { reply, logError } = createReply();
    const err = new Error('boom');

    errorHandler(err, request, reply);

    expect(logError).toHaveBeenCalledWith(err);
  });

  it('maps a schema-validation failure onto 400 Validation', () => {
    const sent = handle(validationError());

    expect(sent.status).toBe(400);
    expect(sent.body).toEqual({
      success: false,
      error: 'Validation',
      message: 'body/title Invalid input',
    });
  });

  it('maps an AppError onto its own status and code', () => {
    const sent = handle(new NotFoundError('Conversation', 'abc'));

    expect(sent.status).toBe(404);
    expect(sent.body).toEqual({
      success: false,
      error: 'NotFound',
      message: 'Conversation with id "abc" not found',
    });
  });

  it("carries an AppError's details into the envelope", () => {
    const sent = handle(new MessageAllowanceReachedError({ limit: 10, count: 10 }));

    expect(sent.status).toBe(403);
    expect(sent.body).toEqual({
      success: false,
      error: 'MessageAllowanceReached',
      message: 'Guest message allowance reached. Register or sign in to continue.',
      details: { limit: 10, count: 10 },
    });
  });

  it('withholds the message of an Internal AppError', () => {
    const sent = handle(new AppError({ error: 'Internal', message: 'pool exhausted' }));

    expect(sent.status).toBe(500);
    expect(sent.body).toEqual({
      success: false,
      error: 'Internal',
      message: GENERIC_ERROR_MESSAGE,
    });
  });

  it.each([
    ['23505', 409, 'Conflict', 'A record with the same unique value already exists.'],
    ['23503', 409, 'Conflict', 'A related record could not be found.'],
    ['23502', 400, 'Validation', 'Missing required data for this operation.'],
    ['23514', 400, 'Validation', 'Provided data did not satisfy a required rule.'],
  ])('translates Postgres %s into a client-safe response', (code, status, error, message) => {
    const sent = handle(pgError(code));

    expect(sent.status).toBe(status);
    expect(sent.body).toEqual({ success: false, error, message });
  });

  it('never leaks the raw database message for a mapped Postgres error', () => {
    expect(handle(pgError('23505')).body?.message).not.toContain('db said no');
  });

  it('treats an unmapped Postgres code as Internal without leaking its message', () => {
    const sent = handle(pgError('99999'));

    expect(sent.status).toBe(500);
    expect(sent.body).toEqual({
      success: false,
      error: 'Internal',
      message: GENERIC_ERROR_MESSAGE,
    });
  });

  it('classifies a client error that carries a statusCode by that status, keeping its message', () => {
    const sent = handle(
      Object.assign(new Error('Rate limit exceeded, retry in 1 minute'), { statusCode: 429 }),
    );

    expect(sent.status).toBe(429);
    expect(sent.body).toEqual({
      success: false,
      error: 'TooManyRequests',
      message: 'Rate limit exceeded, retry in 1 minute',
    });
  });

  it('falls back to a numeric `status` when `statusCode` is absent', () => {
    const sent = handle(Object.assign(new Error('nope'), { status: 409 }));

    expect(sent.status).toBe(409);
    expect(sent.body?.error).toBe('Conflict');
  });

  it('keeps the precise status of a client error whose code is broader', () => {
    const sent = handle(Object.assign(new Error('Unsupported Media Type'), { statusCode: 415 }));

    expect(sent.status).toBe(415);
    expect(sent.body).toEqual({
      success: false,
      error: 'BadRequest',
      message: 'Unsupported Media Type',
    });
  });

  it('prefers statusCode over status when both are present', () => {
    const sent = handle(Object.assign(new Error('nope'), { statusCode: 418, status: 422 }));

    expect(sent.status).toBe(418);
    expect(sent.body?.error).toBe('BadRequest');
  });

  it.each([
    ['a non-numeric statusCode', { statusCode: 'teapot' }],
    ['a status outside the error range', { statusCode: 200 }],
  ])('ignores %s and defaults to 500', (_label, fields) => {
    expect(handle(Object.assign(new Error('nope'), fields)).status).toBe(500);
  });

  it('hides the message of a server-side error that carries a 5xx status', () => {
    const sent = handle(
      Object.assign(new Error('pool exhausted at 10.0.0.5'), { statusCode: 503 }),
    );

    expect(sent.status).toBe(503);
    expect(sent.body).toEqual({
      success: false,
      error: 'Internal',
      message: GENERIC_ERROR_MESSAGE,
    });
  });

  it('reports an unknown error as a 500 Internal without leaking its message', () => {
    const sent = handle(new TypeError("Cannot read properties of undefined (reading 'id')"));

    expect(sent.status).toBe(500);
    expect(sent.body).toEqual({
      success: false,
      error: 'Internal',
      message: GENERIC_ERROR_MESSAGE,
    });
  });

  it('always responds with an envelope the shared schema accepts', () => {
    const errors = [
      validationError(),
      new NotFoundError('x'),
      new MessageAllowanceReachedError({ limit: 1, count: 1 }),
      pgError('23505'),
      pgError('99999'),
      Object.assign(new Error('x'), { statusCode: 415 }),
      new Error('y'),
    ];

    for (const err of errors) {
      expect(errorEnvelopeSchema.safeParse(handle(err).body).success, err.message).toBe(true);
    }
  });
});
