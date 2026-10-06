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

describe('envSchema SHUTDOWN_TIMEOUT_MS', () => {
  it('defaults inside Render’s 30s grace period, so in-flight streams can drain', () => {
    expect(parse({}).data?.SHUTDOWN_TIMEOUT_MS).toBe(25_000);
  });

  it('reads a value from the env as a number', () => {
    expect(parse({ SHUTDOWN_TIMEOUT_MS: '1000' }).data?.SHUTDOWN_TIMEOUT_MS).toBe(1_000);
  });

  it.each(['0', '-1', 'soon'])('rejects %s', (raw) => {
    expect(parse({ SHUTDOWN_TIMEOUT_MS: raw }).success).toBe(false);
  });
});

describe.each(['GOOGLE', 'GITHUB'] as const)('envSchema %s social sign-in', (provider) => {
  const clientId = `${provider}_CLIENT_ID` as const;
  const clientSecret = `${provider}_CLIENT_SECRET` as const;

  it('accepts a client id and secret together', () => {
    const result = parse({ [clientId]: 'client-id', [clientSecret]: 'client-secret' });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ [clientId]: 'client-id', [clientSecret]: 'client-secret' });
  });

  it.each([
    ['unset', undefined],
    ['empty', ''],
  ])('leaves the provider off when both are %s', (_case, raw) => {
    const result = parse({ [clientId]: raw, [clientSecret]: raw });

    expect(result.success).toBe(true);
    expect(result.data?.[clientId]).toBeUndefined();
    expect(result.data?.[clientSecret]).toBeUndefined();
  });

  it.each([
    ['a client id without a secret', { [clientId]: 'client-id' }],
    ['a secret without a client id', { [clientSecret]: 'client-secret' }],
  ])('rejects %s', (_case, overrides) => {
    expect(parse(overrides).success).toBe(false);
  });
});
