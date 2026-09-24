import { describe, expect, it } from 'vitest';
import { MessageAllowanceReachedError, NotFoundError } from '../appError';
import { INTERNAL_ERROR_ENVELOPE } from '../errorEnvelope';
import { toErrorEnvelope } from '../toErrorEnvelope';

describe('toErrorEnvelope', () => {
  it('lets an AppError speak for itself', () => {
    const err = new MessageAllowanceReachedError(10);

    expect(toErrorEnvelope(err)).toEqual(err.toEnvelope());
    expect(toErrorEnvelope(new NotFoundError('Conversation', 'abc'))).toEqual({
      success: false,
      error: 'NotFound',
      message: 'Conversation with id "abc" not found',
    });
  });

  it.each([
    ['an Error', new Error('connect ECONNREFUSED 10.0.0.5:5432')],
    ['a string', 'provider timed out'],
    ['an object', { message: 'secret internals' }],
    ['undefined', undefined],
  ])('reports %s as Internal without leaking its message', (_label, error) => {
    expect(toErrorEnvelope(error)).toEqual(INTERNAL_ERROR_ENVELOPE);
  });
});
