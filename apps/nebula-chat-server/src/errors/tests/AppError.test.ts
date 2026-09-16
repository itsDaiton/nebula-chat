import { describe, expect, it } from 'vitest';
import {
  APIError,
  AppError,
  BadRequestError,
  ClientInitializationError,
  ForbiddenError,
  MissingConfigurationError,
  NotFoundError,
  PayloadTooLargeError,
  RedisCacheError,
  RedisConnectionError,
  UnauthorizedError,
} from '@backend/errors/AppError';

describe('AppError', () => {
  it('defaults to a 500 InternalServerError', () => {
    const err = new AppError('something broke');

    expect(err.status).toBe(500);
    expect(err.error).toBe('InternalServerError');
    expect(err.message).toBe('something broke');
  });

  it('is a real Error, so instanceof and stack traces still work', () => {
    const err = new AppError('boom');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.stack).toBeDefined();
  });

  it('accepts an explicit status and error code', () => {
    const err = new AppError('teapot', 418, 'ImATeapot');

    expect(err.status).toBe(418);
    expect(err.error).toBe('ImATeapot');
  });
});

describe('NotFoundError', () => {
  it('names the resource when no id is given', () => {
    const err = new NotFoundError('Conversation');

    expect(err.message).toBe('Conversation not found');
    expect(err.status).toBe(404);
    expect(err.error).toBe('NotFound');
  });

  it('quotes the id when one is given', () => {
    expect(new NotFoundError('Conversation', 'abc-123').message).toBe(
      'Conversation with id "abc-123" not found',
    );
  });
});

describe('the AppError subclasses', () => {
  it.each([
    [new BadRequestError('bad input'), 400, 'BadRequest', 'bad input'],
    [new UnauthorizedError(), 401, 'Unauthorized', 'Unauthorized'],
    [new UnauthorizedError('token expired'), 401, 'Unauthorized', 'token expired'],
    [new ForbiddenError(), 403, 'Forbidden', 'Forbidden'],
    [new ForbiddenError('not yours'), 403, 'Forbidden', 'not yours'],
    [new PayloadTooLargeError('too many tokens'), 413, 'PayloadTooLarge', 'too many tokens'],
    [
      new MissingConfigurationError('OPENAI_API_KEY'),
      500,
      'MissingConfiguration',
      'OPENAI_API_KEY is not configured',
    ],
    [
      new ClientInitializationError(),
      500,
      'ClientInitializationError',
      'Failed to initialize Client',
    ],
    [
      new ClientInitializationError('Redis'),
      500,
      'ClientInitializationError',
      'Failed to initialize Redis',
    ],
    [new APIError('upstream failed'), 500, 'APIError', 'upstream failed'],
    [new APIError('rate limited', 429), 429, 'APIError', 'rate limited'],
    [new RedisConnectionError(), 500, 'RedisConnectionError', 'Failed to connect to Redis'],
    [new RedisCacheError(), 500, 'RedisCacheError', 'Redis cache operation failed'],
    [new RedisCacheError('GET failed'), 500, 'RedisCacheError', 'GET failed'],
  ])('carries the right status, code and message', (err, status, code, message) => {
    expect(err.status).toBe(status);
    expect(err.error).toBe(code);
    expect(err.message).toBe(message);
  });

  it('are all instances of AppError, so the error handler catches them', () => {
    const errors = [
      new BadRequestError('x'),
      new NotFoundError('x'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new PayloadTooLargeError('x'),
      new MissingConfigurationError('x'),
      new ClientInitializationError(),
      new APIError('x'),
      new RedisConnectionError(),
      new RedisCacheError(),
    ];

    for (const err of errors) {
      expect(err, err.error).toBeInstanceOf(AppError);
    }
  });
});
