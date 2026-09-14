import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { AppError, NotFoundError } from '@backend/errors/AppError';
import { errorHandler } from '@backend/errors/error.handler';

type SentBody = { success: false; error: string; message: string };

/** Minimal reply double capturing the status/body the handler chose. */
const createReply = () => {
  const sent: { status?: number; body?: SentBody } = {};
  const reply = {
    log: { error: vi.fn() },
    status(code: number) {
      sent.status = code;
      return this;
    },
    send(body: SentBody) {
      sent.body = body;
      return this;
    },
  };
  return { reply: reply as unknown as FastifyReply, sent, logError: reply.log.error };
};

const request = {} as FastifyRequest;

/** Shapes a node-postgres style error, which carries a `code` but is not an AppError. */
const pgError = (code: string) => Object.assign(new Error('db said no'), { code });

describe('errorHandler', () => {
  it('logs every error it handles', () => {
    const { reply, logError } = createReply();
    const err = new Error('boom');

    errorHandler(err, request, reply);

    expect(logError).toHaveBeenCalledWith(err);
  });

  it('maps an AppError onto its own status and code', () => {
    const { reply, sent } = createReply();

    errorHandler(new NotFoundError('Conversation', 'abc'), request, reply);

    expect(sent.status).toBe(404);
    expect(sent.body).toEqual({
      success: false,
      error: 'NotFound',
      message: 'Conversation with id "abc" not found',
    });
  });

  it('maps a bare AppError onto 500', () => {
    const { reply, sent } = createReply();

    errorHandler(new AppError('generic failure'), request, reply);

    expect(sent.status).toBe(500);
    expect(sent.body?.error).toBe('InternalServerError');
  });

  it.each([
    ['23505', 409, 'ConflictError', 'A record with the same unique value already exists.'],
    ['23503', 409, 'ConflictError', 'A related record could not be found.'],
    ['23502', 400, 'ValidationError', 'Missing required data for this operation.'],
    ['23514', 400, 'ValidationError', 'Provided data did not satisfy a required rule.'],
  ])('translates Postgres %s into a client-safe response', (code, status, error, message) => {
    const { reply, sent } = createReply();

    errorHandler(pgError(code), request, reply);

    expect(sent.status).toBe(status);
    expect(sent.body).toEqual({ success: false, error, message });
  });

  it('never leaks the raw database message for a mapped Postgres error', () => {
    const { reply, sent } = createReply();

    errorHandler(pgError('23505'), request, reply);

    expect(sent.body?.message).not.toContain('db said no');
  });

  it('falls through to generic handling for an unmapped Postgres code', () => {
    const { reply, sent } = createReply();

    errorHandler(pgError('99999'), request, reply);

    expect(sent.status).toBe(500);
    expect(sent.body?.message).toBe('db said no');
  });

  it('honours a numeric statusCode on a plain error', () => {
    const { reply, sent } = createReply();

    errorHandler(Object.assign(new Error('nope'), { statusCode: 418 }), request, reply);

    expect(sent.status).toBe(418);
  });

  it('falls back to a numeric `status` when `statusCode` is absent', () => {
    const { reply, sent } = createReply();

    errorHandler(Object.assign(new Error('nope'), { status: 422 }), request, reply);

    expect(sent.status).toBe(422);
  });

  it('prefers statusCode over status when both are present', () => {
    const { reply, sent } = createReply();

    errorHandler(
      Object.assign(new Error('nope'), { statusCode: 418, status: 422 }),
      request,
      reply,
    );

    expect(sent.status).toBe(418);
  });

  it('ignores a non-numeric statusCode and defaults to 500', () => {
    const { reply, sent } = createReply();

    errorHandler(Object.assign(new Error('nope'), { statusCode: 'teapot' }), request, reply);

    expect(sent.status).toBe(500);
  });

  it('uses an explicit string `error` field when present', () => {
    const { reply, sent } = createReply();

    errorHandler(Object.assign(new Error('nope'), { error: 'CustomError' }), request, reply);

    expect(sent.body?.error).toBe('CustomError');
  });

  it("falls back to the error's name when no `error` field is present", () => {
    const { reply, sent } = createReply();
    const err = new TypeError('wrong type');

    errorHandler(err, request, reply);

    expect(sent.body?.error).toBe('TypeError');
  });

  it('defaults an unknown error to a 500 InternalServerError shape', () => {
    const { reply, sent } = createReply();

    errorHandler(new Error('unexpected'), request, reply);

    expect(sent.status).toBe(500);
    expect(sent.body).toEqual({ success: false, error: 'Error', message: 'unexpected' });
  });

  it('always responds with success: false', () => {
    for (const err of [new NotFoundError('x'), pgError('23505'), new Error('y')]) {
      const { reply, sent } = createReply();
      errorHandler(err, request, reply);
      expect(sent.body?.success).toBe(false);
    }
  });
});
