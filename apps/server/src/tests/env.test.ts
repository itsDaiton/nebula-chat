import { describe, expect, it } from 'vitest';
import { envSchema } from '@server/env';

const baseEnv = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
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

describe('envSchema Profile image storage', () => {
  const STORAGE = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test',
    PROFILE_IMAGE_BUCKET: 'profile-images-dev',
  };

  it('accepts all three settings together', () => {
    const result = parse(STORAGE);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject(STORAGE);
  });

  it.each([
    ['unset', undefined],
    ['empty', ''],
  ])('switches uploads off when all three are %s', (_case, raw) => {
    const result = parse({
      SUPABASE_URL: raw,
      SUPABASE_SECRET_KEY: raw,
      PROFILE_IMAGE_BUCKET: raw,
    });

    expect(result.success).toBe(true);
    expect(result.data?.SUPABASE_URL).toBeUndefined();
  });

  it.each(Object.keys(STORAGE))('rejects a partial set missing %s', (missing) => {
    const result = parse({ ...STORAGE, [missing]: undefined });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('or none');
  });

  it('rejects a Supabase URL that is not a URL', () => {
    expect(parse({ ...STORAGE, SUPABASE_URL: 'project.supabase' }).success).toBe(false);
  });
});

describe('envSchema log export', () => {
  it.each(['otlp', 'none'])('accepts OTEL_LOGS_EXPORTER=%s', (value) => {
    expect(parse({ OTEL_LOGS_EXPORTER: value }).success).toBe(true);
  });

  it('rejects an exporter the lib does not speak, so a typo fails boot instead of exporting nothing', () => {
    expect(parse({ OTEL_LOGS_EXPORTER: 'otpl' }).success).toBe(false);
  });

  it.each(['OTEL_EXPORTER_OTLP_ENDPOINT', 'OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'])(
    'accepts an http(s) %s and rejects one with no scheme',
    (key) => {
      expect(parse({ [key]: 'http://localhost:4318' }).success).toBe(true);
      expect(parse({ [key]: 'https://otlp-gateway.example.net/otlp' }).success).toBe(true);
      expect(parse({ [key]: 'localhost:4318' }).success).toBe(false);
    },
  );
});

describe('envSchema hardening', () => {
  it('rejects a BETTER_AUTH_SECRET under 32 characters', () => {
    const result = parse({ BETTER_AUTH_SECRET: 'x'.repeat(31) });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('BETTER_AUTH_SECRET');
  });

  it('accepts a 32 character BETTER_AUTH_SECRET', () => {
    expect(parse({ BETTER_AUTH_SECRET: 'x'.repeat(32) }).success).toBe(true);
  });

  it('rejects a negative GUEST_MESSAGE_ALLOWANCE and accepts 0', () => {
    expect(parse({ GUEST_MESSAGE_ALLOWANCE: '-1' }).success).toBe(false);
    expect(parse({ GUEST_MESSAGE_ALLOWANCE: '0' }).success).toBe(true);
  });

  it('rejects an http BETTER_AUTH_URL in production', () => {
    const result = parse({
      NODE_ENV: 'production',
      BETTER_AUTH_URL: 'http://api.example.com',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('BETTER_AUTH_URL');
  });

  it('accepts an https BETTER_AUTH_URL in production', () => {
    expect(
      parse({ NODE_ENV: 'production', BETTER_AUTH_URL: 'https://api.example.com' }).success,
    ).toBe(true);
  });

  it('keeps an http BETTER_AUTH_URL working outside production', () => {
    expect(parse({ NODE_ENV: 'development' }).success).toBe(true);
  });

  describe('an unset NODE_ENV', () => {
    it('boots as development against a localhost BETTER_AUTH_URL', () => {
      const result = parse({});

      expect(result.success).toBe(true);
      expect(result.data?.NODE_ENV).toBe('development');
    });

    it.each(['http://127.0.0.1:3000', 'http://[::1]:3000'])('boots against %s', (url) => {
      expect(parse({ BETTER_AUTH_URL: url }).success).toBe(true);
    });

    it('fails when BETTER_AUTH_URL is not localhost', () => {
      const result = parse({ BETTER_AUTH_URL: 'https://api.example.com' });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('NODE_ENV');
    });

    it('fails when RENDER is set', () => {
      const result = parse({ RENDER: 'true' });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('NODE_ENV');
    });
  });
});

describe('envSchema API_DOCS_ENABLED', () => {
  it.each([
    ['development', true],
    ['test', true],
    ['production', false],
  ] as const)('defaults for %s to %s', (nodeEnv, expected) => {
    const result = parse({ NODE_ENV: nodeEnv, BETTER_AUTH_URL: 'https://api.example.com' });

    expect(result.data?.API_DOCS_ENABLED).toBe(expected);
  });

  it('defaults to true for an unset NODE_ENV on localhost', () => {
    expect(parse({}).data?.API_DOCS_ENABLED).toBe(true);
  });

  it.each([
    ['production', 'true', true],
    ['development', 'false', false],
    ['test', 'false', false],
  ] as const)('lets an explicit value win in %s', (nodeEnv, raw, expected) => {
    const result = parse({
      NODE_ENV: nodeEnv,
      BETTER_AUTH_URL: 'https://api.example.com',
      API_DOCS_ENABLED: raw,
    });

    expect(result.data?.API_DOCS_ENABLED).toBe(expected);
  });

  it('reads an empty value as unset', () => {
    expect(
      parse({
        NODE_ENV: 'production',
        BETTER_AUTH_URL: 'https://a.example.com',
        API_DOCS_ENABLED: '',
      }).data?.API_DOCS_ENABLED,
    ).toBe(false);
  });

  it('rejects a value that is not a boolean', () => {
    expect(parse({ API_DOCS_ENABLED: 'maybe' }).success).toBe(false);
  });
});
