import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { recordedErrorType } from '@backend/errors/requestErrorType';
import { captureLogger, LEVEL } from '@backend/test/logCapture';
import { logController } from '@backend/utils/logController';

const exchange = () => {
  const { logger, lines } = captureLogger();
  const req = { method: 'GET', url: '/x?y=1', log: logger } as unknown as FastifyRequest;
  const reply = { log: logger, request: req } as unknown as FastifyReply;
  return { req, reply, lines, logger };
};

describe('logController', () => {
  it("replaces Fastify's request lines with the request-logging hooks", () => {
    const { req, reply, lines } = exchange();

    logController.incomingRequest(req, reply);
    logController.requestCompleted(null, req, reply);
    logController.requestCompleted(new Error('boom'), req, reply);

    expect(lines).toEqual([]);
  });

  it('records an unknown route as NotFound for the completion line, writing nothing itself', () => {
    const { req, reply, lines } = exchange();

    logController.routeNotFound(req, reply);

    expect(recordedErrorType(req)).toBe('NotFound');
    expect(lines).toEqual([]);
  });

  it("classifies a 4xx from Fastify's fallback error handler and writes nothing", () => {
    const { req, reply, lines } = exchange();
    Object.assign(reply, { statusCode: 415 });

    logController.defaultErrorLog(new Error('Unsupported Media Type'), req, reply);

    expect(recordedErrorType(req)).toBe('BadRequest');
    expect(lines).toEqual([]);
  });

  it("writes a 5xx from Fastify's fallback error handler once, at error", () => {
    const { req, reply, lines } = exchange();
    Object.assign(reply, { statusCode: 500 });

    logController.defaultErrorLog(new Error('handler threw'), req, reply);

    expect(recordedErrorType(req)).toBe('Internal');
    expect(lines).toEqual([
      expect.objectContaining({
        level: LEVEL.error,
        'event.name': 'fastify.log',
        'error.type': 'Internal',
        err: expect.objectContaining({ message: 'handler threw' }),
      }),
    ]);
  });

  it.each([
    ['a failing serializer', 'serializerError', LEVEL.error],
    ['a failing writeHead', 'writeHeadError', LEVEL.warn],
    ['a stream that errors after the headers', 'streamError', LEVEL.warn],
  ] as const)('stamps %s as fastify.log with its err', (_label, method, level) => {
    const { req, reply, lines } = exchange();

    logController[method](new Error('internal'), req, reply, { statusCode: 500 });

    expect(lines).toEqual([
      expect.objectContaining({
        level,
        'event.name': 'fastify.log',
        'nebula.component': 'http',
        err: expect.objectContaining({ message: 'internal' }),
      }),
    ]);
  });

  it('writes a client closing the stream early at debug, not as a failure', () => {
    const { req, reply, lines } = exchange();
    const prematureClose = Object.assign(new Error('Premature close'), {
      code: 'ERR_STREAM_PREMATURE_CLOSE',
    });

    logController.streamError(prematureClose, req, reply);

    expect(lines).toEqual([
      expect.objectContaining({ level: LEVEL.debug, 'event.name': 'fastify.log' }),
    ]);
  });

  it('stamps the shutting-down refusal as fastify.log', () => {
    const { logger, lines } = exchange();

    logController.serviceUnavailable(logger, {} as FastifyInstance);

    expect(lines).toEqual([
      expect.objectContaining({
        level: LEVEL.info,
        'event.name': 'fastify.log',
        'http.response.status_code': 503,
      }),
    ]);
  });
});
