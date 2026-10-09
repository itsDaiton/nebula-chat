import { fromPartial } from '@total-typescript/shoehorn';
import { describe, expect, it } from 'vitest';
import { requestPath } from '@backend/utils/requestPath';

const pathOf = (url: string) => requestPath(fromPartial({ url }));

describe('requestPath', () => {
  it.each([
    ['/api/auth/reset-password/Rm8Aaya7lfP9EkO2xUInKVBfT', '/api/auth/reset-password/[Redacted]'],
    [
      '/api/auth/reset-password/Rm8Aaya7lfP9EkO2xUInKVBfT?callbackURL=https%3A%2F%2Fapp%2Fauth',
      '/api/auth/reset-password/[Redacted]',
    ],
    ['/api/auth/reset-password/not-a-real-token!', '/api/auth/reset-password/[Redacted]'],
    ['/api/auth/reset-password/Rm8Aaya7lfP9EkO2xUInKVBfT/', '/api/auth/reset-password/[Redacted]'],
    [
      '/api/auth/reset-password/Rm8Aaya7lfP9EkO2xUInKVBfT/extra',
      '/api/auth/reset-password/[Redacted]',
    ],
  ])('redacts the reset token in %s', (url, expected) => {
    expect(pathOf(url)).toBe(expected);
  });

  it.each([
    ['/api/auth/reset-password', '/api/auth/reset-password'],
    ['/api/auth/reset-password/', '/api/auth/reset-password/'],
    ['/api/conversations?cursor=abc&q=secret', '/api/conversations'],
    ['/api/auth/callback/github?code=abc&state=xyz', '/api/auth/callback/github'],
    ['/', '/'],
  ])('logs %s as %s', (url, expected) => {
    expect(pathOf(url)).toBe(expected);
  });
});
