import { describe, expect, it } from 'vitest';
import {
  errorEnvelopeSchema,
  isErrorEnvelope,
  parseErrorEnvelope,
  type ErrorEnvelope,
} from '../errorEnvelope';

const allowanceEnvelope = {
  success: false,
  error: 'MessageAllowanceReached',
  message: 'Guest message allowance reached.',
  details: { limit: 10, count: 10 },
} as const;

describe('errorEnvelopeSchema', () => {
  it.each([
    'BadRequest',
    'Validation',
    'Unauthorized',
    'Forbidden',
    'NotFound',
    'Conflict',
    'PayloadTooLarge',
    'TooManyRequests',
    'Internal',
  ])('accepts a %s envelope', (code) => {
    const envelope = { success: false, error: code, message: 'nope' };

    expect(errorEnvelopeSchema.parse(envelope)).toEqual(envelope);
  });

  it('accepts a MessageAllowanceReached envelope with its details', () => {
    expect(errorEnvelopeSchema.parse(allowanceEnvelope)).toEqual(allowanceEnvelope);
  });

  it('requires details on MessageAllowanceReached', () => {
    const withoutDetails = { success: false, error: 'MessageAllowanceReached', message: 'x' };

    expect(errorEnvelopeSchema.safeParse(withoutDetails).success).toBe(false);
  });

  it('rejects malformed details', () => {
    const envelope = { ...allowanceEnvelope, details: { limit: 'ten', count: 10 } };

    expect(errorEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });

  it('drops details from a code that carries none', () => {
    const parsed = errorEnvelopeSchema.parse({
      success: false,
      error: 'Forbidden',
      message: 'nope',
      details: { limit: 1, count: 1 },
    });

    expect(parsed).not.toHaveProperty('details');
  });

  it.each([
    ['a code outside the closed union', { success: false, error: 'ImATeapot', message: 'x' }],
    ['success: true', { success: true, error: 'NotFound', message: 'x' }],
    ['a missing message', { success: false, error: 'NotFound' }],
    ['a missing code', { success: false, message: 'x' }],
  ])('rejects %s', (_label, envelope) => {
    expect(errorEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });
});

describe('isErrorEnvelope', () => {
  it('recognises a valid envelope', () => {
    expect(isErrorEnvelope({ success: false, error: 'Internal', message: 'boom' })).toBe(true);
  });

  it.each([null, undefined, 'boom', 42, { error: 'boom' }, { success: false, error: 'Nope' }])(
    'rejects %j',
    (value) => {
      expect(isErrorEnvelope(value)).toBe(false);
    },
  );

  it('narrows details by code once recognised', () => {
    const value: unknown = allowanceEnvelope;

    if (!isErrorEnvelope(value) || value.error !== 'MessageAllowanceReached') {
      throw new Error('expected a MessageAllowanceReached envelope');
    }

    // Required on this code, so no optional chaining is needed.
    expect(value.details.limit).toBe(10);
  });
});

describe('parseErrorEnvelope', () => {
  it('returns the envelope for a valid value', () => {
    const envelope: ErrorEnvelope = { success: false, error: 'NotFound', message: 'gone' };

    expect(parseErrorEnvelope(envelope)).toEqual(envelope);
  });

  it('returns null for anything else', () => {
    expect(parseErrorEnvelope({ error: 'Rate limit exceeded.' })).toBeNull();
  });
});
