import { describe, expect, it } from 'vitest';
import { errorCodeSchema, GENERIC_ERROR_MESSAGE } from '../errorEnvelope';
import { ERROR_MESSAGE } from '../errorMessages';

describe('ERROR_MESSAGE', () => {
  it.each(errorCodeSchema.options)('gives %s a fixed, non-empty message', (code) => {
    expect(ERROR_MESSAGE[code].length).toBeGreaterThan(0);
  });

  it('answers Internal with the generic message', () => {
    expect(ERROR_MESSAGE.Internal).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('words Validation without naming any field or value', () => {
    expect(ERROR_MESSAGE.Validation).toBe('The request is invalid.');
  });
});
