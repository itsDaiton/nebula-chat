import { describe, expect, it } from 'vitest';
import { envSchema } from '@backend/env';

const baseEnv = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  OPENAI_API_KEY: 'sk-test-key-not-used',
  BETTER_AUTH_SECRET: 'test-better-auth-secret-not-used',
  BETTER_AUTH_URL: 'http://localhost:3000',
  RESEND_API_KEY: 're_test_key_not_used',
  EMAIL_FROM: 'Nebula Chat <hello@example.com>',
};

const parse = (overrides: Record<string, string | undefined>) =>
  envSchema.safeParse({ ...baseEnv, ...overrides });

describe.each(['CLIENT_URL', 'SERVER_URL'] as const)('envSchema %s', (key) => {
  it.each([
    ['an http origin', 'http://localhost:5173', 'http://localhost:5173'],
    ['an https origin', 'https://app.example.com', 'https://app.example.com'],
    ['a trailing slash', 'http://localhost:5173/', 'http://localhost:5173'],
    ['a path', 'https://app.example.com/chat/', 'https://app.example.com'],
    ['a default port', 'https://app.example.com:443', 'https://app.example.com'],
  ])('normalises %s to the origin', (_case, raw, origin) => {
    const result = parse({ [key]: raw });

    expect(result.success).toBe(true);
    expect(result.data?.[key]).toBe(origin);
  });

  it.each([
    // The scheme-less value that booted but matched no browser `Origin` header.
    ['a value with no scheme', 'localhost:5173'],
    ['a non-http scheme', 'ftp://localhost:5173'],
    ['a value that is not a URL', 'not a url'],
  ])('rejects %s', (_case, raw) => {
    expect(parse({ [key]: raw }).success).toBe(false);
  });
});

describe('envSchema defaults', () => {
  it('falls back to the local client origin when CLIENT_URL is unset', () => {
    expect(parse({}).data?.CLIENT_URL).toBe('http://localhost:5173');
  });

  it('reads an empty SERVER_URL as unset', () => {
    const result = parse({ SERVER_URL: '' });

    expect(result.success).toBe(true);
    expect(result.data?.SERVER_URL).toBeUndefined();
  });
});

describe('envSchema EMAIL_FROM', () => {
  it.each([
    ['a bare address', 'hello@example.com'],
    ['a display name and address', 'Nebula Chat <hello@example.com>'],
  ])('accepts %s', (_case, raw) => {
    expect(parse({ EMAIL_FROM: raw }).success).toBe(true);
  });

  it.each([
    ['a missing value', undefined],
    ['an empty value', ''],
    ['a name with no address', 'Nebula Chat'],
    ['a malformed address', 'Nebula Chat <hello@>'],
  ])('rejects %s', (_case, raw) => {
    expect(parse({ EMAIL_FROM: raw }).success).toBe(false);
  });
});

describe('envSchema RESEND_API_KEY', () => {
  it.each([
    ['a missing key', undefined],
    ['an empty key', ''],
  ])('rejects %s', (_case, raw) => {
    expect(parse({ RESEND_API_KEY: raw }).success).toBe(false);
  });
});
