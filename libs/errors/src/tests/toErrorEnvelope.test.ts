import { describe, expect, it } from 'vitest';
import { AppError, ForbiddenError, MissingConfigurationError, NotFoundError } from '../appError';
import { errorEnvelopeSchema } from '../errorEnvelope';
import { GENERIC_ERROR_MESSAGE, toErrorEnvelope } from '../toErrorEnvelope';

describe('toErrorEnvelope', () => {
  it("carries an AppError's own code and message", () => {
    expect(toErrorEnvelope(new NotFoundError('Conversation', 'abc'))).toEqual({
      success: false,
      error: 'NotFound',
      message: 'Conversation with id "abc" not found',
    });
  });

  it("carries an AppError's details", () => {
    const envelope = toErrorEnvelope(
      new ForbiddenError('Guest message allowance reached.', { limit: 10, count: 10 }),
    );

    expect(envelope).toEqual({
      success: false,
      error: 'Forbidden',
      message: 'Guest message allowance reached.',
      details: { limit: 10, count: 10 },
    });
  });

  it('hides the message of an AppError classified as Internal', () => {
    expect(toErrorEnvelope(new MissingConfigurationError('OPENAI_API_KEY'))).toEqual({
      success: false,
      error: 'Internal',
      message: GENERIC_ERROR_MESSAGE,
    });
  });

  it('omits details entirely when an AppError has none', () => {
    expect(toErrorEnvelope(new ForbiddenError())).not.toHaveProperty('details');
  });

  it.each([
    ['an Error', new Error('connect ECONNREFUSED 10.0.0.5:5432')],
    ['a string', 'provider timed out'],
    ['an object', { message: 'secret internals' }],
    ['undefined', undefined],
  ])('reports %s as Internal without leaking its message', (_label, error) => {
    expect(toErrorEnvelope(error)).toEqual({
      success: false,
      error: 'Internal',
      message: GENERIC_ERROR_MESSAGE,
    });
  });

  it('always produces an envelope the schema accepts', () => {
    const inputs = [
      new NotFoundError('x'),
      new ForbiddenError('x', { limit: 1, count: 1 }),
      new AppError({ code: 'Conflict', status: 409, message: 'x' }),
      new Error('x'),
    ];

    for (const input of inputs) {
      expect(errorEnvelopeSchema.safeParse(toErrorEnvelope(input)).success).toBe(true);
    }
  });
});
