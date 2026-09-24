import { describe, expect, it } from 'vitest';
import {
  errorEnvelopeSchema,
  isErrorEnvelope,
  parseErrorEnvelope,
  type ErrorEnvelope,
} from '../errorEnvelope';

describe('errorEnvelopeSchema', () => {
  it.each([
    'BadRequest',
    'Validation',
    'Unauthorized',
    'Forbidden',
    'MessageAllowanceReached',
    'NotFound',
    'Conflict',
    'PayloadTooLarge',
    'TooManyRequests',
    'Internal',
  ])('accepts a %s envelope', (code) => {
    const envelope = { success: false, error: code, message: 'nope' };

    expect(errorEnvelopeSchema.parse(envelope)).toEqual(envelope);
  });

  it('drops fields outside the envelope', () => {
    const parsed = errorEnvelopeSchema.parse({
      success: false,
      error: 'NotFound',
      message: 'nope',
      stack: 'at db.query',
    });

    expect(parsed).toEqual({ success: false, error: 'NotFound', message: 'nope' });
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
