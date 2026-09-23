import { describe, expect, it } from 'vitest';
import { errorEnvelopeSchema, isErrorEnvelope, parseErrorEnvelope } from '../errorEnvelope';
import type { ErrorEnvelope } from '../errorEnvelope';

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
  ])('accepts a %s envelope without details', (code) => {
    const envelope = { success: false, error: code, message: 'nope' };

    expect(errorEnvelopeSchema.safeParse(envelope).success).toBe(true);
  });

  it('accepts a Forbidden envelope carrying message-allowance details', () => {
    const envelope = {
      success: false,
      error: 'Forbidden',
      message: 'Guest message allowance reached.',
      details: { limit: 10, count: 10 },
    };

    expect(errorEnvelopeSchema.parse(envelope)).toEqual(envelope);
  });

  it('rejects a code outside the closed union', () => {
    const envelope = { success: false, error: 'ImATeapot', message: 'nope' };

    expect(errorEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });

  it('rejects malformed Forbidden details', () => {
    const envelope = {
      success: false,
      error: 'Forbidden',
      message: 'nope',
      details: { limit: 'ten', count: 10 },
    };

    expect(errorEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });

  it('drops details from a code that carries none', () => {
    const parsed = errorEnvelopeSchema.parse({
      success: false,
      error: 'NotFound',
      message: 'nope',
      details: { limit: 1, count: 1 },
    });

    expect(parsed).not.toHaveProperty('details');
  });

  it.each([
    ['success: true', { success: true, error: 'NotFound', message: 'nope' }],
    ['a missing message', { success: false, error: 'NotFound' }],
    ['a missing code', { success: false, message: 'nope' }],
  ])('rejects an envelope with %s', (_label, envelope) => {
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
    const value: unknown = {
      success: false,
      error: 'Forbidden',
      message: 'cap',
      details: { limit: 10, count: 10 },
    };

    if (!isErrorEnvelope(value) || value.error !== 'Forbidden') {
      throw new Error('expected a Forbidden envelope');
    }

    expect(value.details?.limit).toBe(10);
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
