import { describe, expect, it } from 'vitest';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  isAppError,
  MessageAllowanceReachedError,
  MissingConfigurationError,
  NotFoundError,
  PayloadTooLargeError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from '../appError';
import { errorEnvelopeSchema, GENERIC_ERROR_MESSAGE } from '../errorEnvelope';

describe('AppError', () => {
  it('takes its status from its code', () => {
    const err = new AppError('Conflict', 'taken');

    expect(err.code).toBe('Conflict');
    expect(err.status).toBe(409);
    expect(err.message).toBe('taken');
  });

  it('is a real Error named after its class, so logs say what went wrong', () => {
    const err = new NotFoundError('Conversation');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('NotFoundError');
    expect(err.stack).toBeDefined();
  });

  it('answers with its code and message as the envelope', () => {
    expect(new AppError('Conflict', 'taken').toEnvelope()).toEqual({
      success: false,
      error: 'Conflict',
      message: 'taken',
    });
  });

  it('withholds the message of an Internal error, which is a server-side fault', () => {
    expect(new MissingConfigurationError('OPENAI_API_KEY').toEnvelope()).toEqual({
      success: false,
      error: 'Internal',
      message: GENERIC_ERROR_MESSAGE,
    });
  });
});

describe('NotFoundError', () => {
  it('names the resource when no id is given', () => {
    expect(new NotFoundError('Conversation').message).toBe('Conversation not found');
  });

  it('quotes the id when one is given', () => {
    expect(new NotFoundError('Conversation', 'abc-123').message).toBe(
      'Conversation with id "abc-123" not found',
    );
  });
});

describe('MessageAllowanceReachedError', () => {
  it('answers 403 and names the allowance it exceeded', () => {
    const err = new MessageAllowanceReachedError(10);

    expect(err.status).toBe(403);
    expect(err.toEnvelope()).toEqual({
      success: false,
      error: 'MessageAllowanceReached',
      message: 'Message allowance exceeded: a Guest can send at most 10 messages.',
    });
  });
});

describe('the AppError subclasses', () => {
  it.each([
    [new BadRequestError('bad input'), 400, 'BadRequest', 'bad input'],
    [new ValidationError('bad field'), 400, 'Validation', 'bad field'],
    [new UnauthorizedError(), 401, 'Unauthorized', 'Unauthorized'],
    [new UnauthorizedError('token expired'), 401, 'Unauthorized', 'token expired'],
    [new ForbiddenError(), 403, 'Forbidden', 'Forbidden'],
    [new ForbiddenError('not yours'), 403, 'Forbidden', 'not yours'],
    [new NotFoundError('Message'), 404, 'NotFound', 'Message not found'],
    [new ConflictError('taken'), 409, 'Conflict', 'taken'],
    [new PayloadTooLargeError('too many tokens'), 413, 'PayloadTooLarge', 'too many tokens'],
    [new TooManyRequestsError(), 429, 'TooManyRequests', 'Too many requests'],
    [new TooManyRequestsError('slow down'), 429, 'TooManyRequests', 'slow down'],
    [
      new MissingConfigurationError('OPENAI_API_KEY'),
      500,
      'Internal',
      'OPENAI_API_KEY is not configured',
    ],
  ])('%s carries the right status, code and message', (err, status, code, message) => {
    expect(err.status).toBe(status);
    expect(err.code).toBe(code);
    expect(err.message).toBe(message);
    expect(err).toBeInstanceOf(AppError);
    expect(errorEnvelopeSchema.safeParse(err.toEnvelope()).success).toBe(true);
  });
});

describe('isAppError', () => {
  it('recognises an AppError and its subclasses', () => {
    expect(isAppError(new AppError('Internal', 'x'))).toBe(true);
    expect(isAppError(new NotFoundError('x'))).toBe(true);
  });

  it.each([new Error('x'), { code: 'NotFound', status: 404, message: 'x' }, null, 'x'])(
    'rejects %j',
    (value) => {
      expect(isAppError(value)).toBe(false);
    },
  );
});
