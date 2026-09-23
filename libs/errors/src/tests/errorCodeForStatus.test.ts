import { describe, expect, it } from 'vitest';
import { errorCodeForStatus } from '../errorCodeForStatus';

describe('errorCodeForStatus', () => {
  it.each([
    [400, 'BadRequest'],
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [404, 'NotFound'],
    [409, 'Conflict'],
    [413, 'PayloadTooLarge'],
    [422, 'Validation'],
    [429, 'TooManyRequests'],
  ])('maps %i to %s', (status, code) => {
    expect(errorCodeForStatus(status)).toBe(code);
  });

  it.each([405, 415, 418])('treats an unmapped client error (%i) as BadRequest', (status) => {
    expect(errorCodeForStatus(status)).toBe('BadRequest');
  });

  it.each([500, 502, 503, 200, 0])('treats anything else (%i) as Internal', (status) => {
    expect(errorCodeForStatus(status)).toBe('Internal');
  });
});
