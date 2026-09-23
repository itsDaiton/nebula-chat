import { describe, expect, it } from 'vitest';
import {
  APIError,
  AppError,
  BadRequestError,
  ClientInitializationError,
  ForbiddenError,
  isAppError,
  MissingConfigurationError,
  NotFoundError,
  PayloadTooLargeError,
  RedisCacheError,
  RedisConnectionError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../appError';

describe('AppError', () => {
  it('carries the code, status and message it was built with', () => {
    const err = new AppError({ code: 'Conflict', status: 409, message: 'taken' });

    expect(err.code).toBe('Conflict');
    expect(err.status).toBe(409);
    expect(err.message).toBe('taken');
    expect(err.details).toBeUndefined();
  });

  it('is a real Error, so instanceof and stack traces still work', () => {
    const err = new AppError({ code: 'Internal', status: 500, message: 'boom' });

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.stack).toBeDefined();
  });

  it("names a subclass instance after the subclass, so logs say what's wrong", () => {
    expect(new NotFoundError('Conversation').name).toBe('NotFoundError');
  });
});

describe('NotFoundError', () => {
  it('names the resource when no id is given', () => {
    const err = new NotFoundError('Conversation');

    expect(err.message).toBe('Conversation not found');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NotFound');
  });

  it('quotes the id when one is given', () => {
    expect(new NotFoundError('Conversation', 'abc-123').message).toBe(
      'Conversation with id "abc-123" not found',
    );
  });
});

describe('ForbiddenError', () => {
  it('carries no details for a plain refusal', () => {
    expect(new ForbiddenError('not yours').details).toBeUndefined();
  });

  it('carries typed message-allowance details when given them', () => {
    const err = new ForbiddenError('Guest message allowance reached.', { limit: 10, count: 12 });

    expect(err.details).toEqual({ limit: 10, count: 12 });
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
    [new TooManyRequestsError(), 429, 'TooManyRequests', 'Too many requests'],
    [new TooManyRequestsError('slow down'), 429, 'TooManyRequests', 'slow down'],
    [
      new MissingConfigurationError('OPENAI_API_KEY'),
      500,
      'Internal',
      'OPENAI_API_KEY is not configured',
    ],
    [new ClientInitializationError(), 500, 'Internal', 'Failed to initialize Client'],
    [new ClientInitializationError('Redis'), 500, 'Internal', 'Failed to initialize Redis'],
    [new APIError('upstream failed'), 500, 'Internal', 'upstream failed'],
    [new APIError('rate limited', 429), 429, 'TooManyRequests', 'rate limited'],
    [new APIError('no reply', 502), 502, 'Internal', 'no reply'],
    [new RedisConnectionError(), 500, 'Internal', 'Failed to connect to Redis'],
    [new RedisCacheError(), 500, 'Internal', 'Redis cache operation failed'],
    [new RedisCacheError('GET failed'), 500, 'Internal', 'GET failed'],
  ])('%s carries the right status, code and message', (err, status, code, message) => {
    expect(err.status).toBe(status);
    expect(err.code).toBe(code);
    expect(err.message).toBe(message);
  });

  it('are all instances of AppError, so the error handler catches them', () => {
    const errors = [
      new BadRequestError('x'),
      new NotFoundError('x'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new PayloadTooLargeError('x'),
      new TooManyRequestsError(),
      new MissingConfigurationError('x'),
      new ClientInitializationError(),
      new APIError('x'),
      new RedisConnectionError(),
      new RedisCacheError(),
    ];

    for (const err of errors) {
      expect(err, err.name).toBeInstanceOf(AppError);
    }
  });
});

describe('isAppError', () => {
  it('recognises an AppError and its subclasses', () => {
    expect(isAppError(new AppError({ code: 'Internal', status: 500, message: 'x' }))).toBe(true);
    expect(isAppError(new NotFoundError('x'))).toBe(true);
  });

  it.each([new Error('x'), { code: 'NotFound', status: 404, message: 'x' }, null, 'x'])(
    'rejects %j',
    (value) => {
      expect(isAppError(value)).toBe(false);
    },
  );
});
