import { describe, expect, it } from 'vitest';
import { ERROR_STATUS, errorCodeForStatus } from '../errorStatus';

describe('ERROR_STATUS', () => {
  it.each([
    ['BadRequest', 400],
    ['Validation', 400],
    ['Unauthorized', 401],
    ['Forbidden', 403],
    ['MessageAllowanceReached', 403],
    ['NotFound', 404],
    ['Conflict', 409],
    ['PayloadTooLarge', 413],
    ['TooManyRequests', 429],
    ['Internal', 500],
  ] as const)('answers %s with %i', (code, status) => {
    expect(ERROR_STATUS[code]).toBe(status);
  });
});

describe('errorCodeForStatus', () => {
  it.each([
    [400, 'BadRequest'],
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [404, 'NotFound'],
    [409, 'Conflict'],
    [413, 'PayloadTooLarge'],
    [429, 'TooManyRequests'],
    [500, 'Internal'],
  ])('maps %i to its general code %s', (status, code) => {
    expect(errorCodeForStatus(status)).toBe(code);
  });

  it.each([405, 415, 418, 422])('treats an unmapped client error (%i) as BadRequest', (status) => {
    expect(errorCodeForStatus(status)).toBe('BadRequest');
  });

  it.each([502, 503, 200, 0])('treats anything else (%i) as Internal', (status) => {
    expect(errorCodeForStatus(status)).toBe('Internal');
  });
});
