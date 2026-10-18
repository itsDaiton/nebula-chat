import { parseUserInput, parseUserOutput } from 'better-auth/db';
import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@nebula-chat/db';
import type { Logger } from '@nebula-chat/otel';
import type { AuthStore } from '@nebula-chat/redis';
import { createAuth } from '../auth';
import type { CreateAuthConfig } from '../auth';

/** An in-memory `authStore`: `sign-in/social` keeps its OAuth state there. */
const makeAuthStore = (): AuthStore => {
  const entries = new Map<string, string>();
  return {
    get: async (key) => entries.get(key) ?? null,
    getAndDelete: async (key) => {
      const value = entries.get(key) ?? null;
      entries.delete(key);
      return value;
    },
    increment: async (key) => {
      const next = Number(entries.get(key) ?? 0) + 1;
      entries.set(key, String(next));
      return next;
    },
    set: async (key, value) => {
      entries.set(key, value);
    },
    delete: async (key) => {
      entries.delete(key);
    },
  };
};

const logger = {
  child: () => logger,
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Starting a social sign-in reads no table, so the database is never reached.
const buildAuth = (socialProviders?: CreateAuthConfig['socialProviders']) =>
  createAuth({
    db: {} as DbClient,
    authStore: makeAuthStore(),
    logger: logger as unknown as Logger,
    secret: 'test-secret-that-is-long-enough-for-better-auth',
    baseURL: 'http://localhost:3000',
    trustedOrigins: ['http://localhost:5173'],
    sendEmail: vi.fn(),
    errorURL: 'http://localhost:5173/auth',
    socialProviders,
  });

const CREDENTIALS = {
  google: { clientId: 'google-client-id', clientSecret: 'google-client-secret' },
  github: { clientId: 'github-client-id', clientSecret: 'github-client-secret' },
};

const startSocialSignIn = (auth: ReturnType<typeof buildAuth>, provider: string) =>
  auth.handler(
    new Request('http://localhost:3000/api/auth/sign-in/social', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
      body: JSON.stringify({ provider, callbackURL: 'http://localhost:5173/' }),
    }),
  );

describe('createAuth social sign-in', () => {
  it.each([
    ['google', 'accounts.google.com', 'google-client-id'],
    ['github', 'github.com', 'github-client-id'],
  ])('sends a %s sign-in to the provider with our client id', async (provider, host, clientId) => {
    const response = await startSocialSignIn(buildAuth(CREDENTIALS), provider);
    const { url } = (await response.json()) as { url: string };
    const authorizationUrl = new URL(url);

    expect(response.status).toBe(200);
    expect(authorizationUrl.host).toBe(host);
    expect(authorizationUrl.searchParams.get('client_id')).toBe(clientId);
  });

  it.each(['google', 'github'])('returns %s to the server callback', async (provider) => {
    const response = await startSocialSignIn(buildAuth(CREDENTIALS), provider);
    const { url } = (await response.json()) as { url: string };

    expect(new URL(url).searchParams.get('redirect_uri')).toBe(
      `http://localhost:3000/api/auth/callback/${provider}`,
    );
  });

  it('rejects a provider it was given no credentials for', async () => {
    const response = await startSocialSignIn(buildAuth({ google: CREDENTIALS.google }), 'github');

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'PROVIDER_NOT_FOUND' });
  });

  it('enables no provider by default', async () => {
    const response = await startSocialSignIn(buildAuth(), 'google');

    expect(response.status).toBe(404);
  });

  it('sends a callback it cannot trace to a sign-in back to the client error page', async () => {
    const response = await buildAuth(CREDENTIALS).handler(
      new Request('http://localhost:3000/api/auth/callback/google?code=abc'),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'http://localhost:5173/auth?error=state_not_found',
    );
  });
});

describe('createAuth Profile image', () => {
  it('refuses a client that sets the storage key through update-user', () => {
    const { options } = buildAuth();

    expect(() => parseUserInput(options, { profileImageKey: 'user-1/x.webp' }, 'update')).toThrow(
      'profileImageKey is not allowed to be set',
    );
  });

  it('keeps the storage key out of the user it sends the client', () => {
    const { options } = buildAuth();

    const user = parseUserOutput(options, {
      id: 'user-1',
      name: 'Ada',
      email: 'ada@example.com',
      emailVerified: true,
      image: 'https://cdn.example.com/user-1/x.webp',
      profileImageKey: 'user-1/x.webp',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(user).toMatchObject({ image: 'https://cdn.example.com/user-1/x.webp' });
    expect(user).not.toHaveProperty('profileImageKey');
  });

  it.each(['google', 'github'] as const)(
    'never refreshes the %s picture on a later sign-in, so an upload sticks',
    (provider) => {
      const { options } = buildAuth(CREDENTIALS);

      expect(options.socialProviders?.[provider]).toMatchObject({
        clientId: CREDENTIALS[provider].clientId,
        overrideUserInfoOnSignIn: false,
      });
    },
  );

  it('never copies a linked provider profile onto the user', () => {
    expect(buildAuth(CREDENTIALS).options.account?.accountLinking?.updateUserInfoOnLink).toBe(
      false,
    );
  });
});

describe('createAuth rate limiting', () => {
  const signIn = (auth: ReturnType<typeof buildAuth>, headers: Record<string, string>) =>
    auth.handler(
      new Request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:5173',
          ...headers,
        },
        body: JSON.stringify({ email: 'a@example.com', password: 'wrong-password' }),
      }),
    );

  // Rate limiting is off outside production, so the keys it writes are read from the store.
  const keysFor = async (headers: Record<string, string>) => {
    const authStore = makeAuthStore();
    const incremented: string[] = [];
    const increment = authStore.increment;
    authStore.increment = async (key, ttl) => {
      incremented.push(key);
      return increment(key, ttl);
    };
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const auth = createAuth({
        db: {} as DbClient,
        authStore,
        logger: logger as unknown as Logger,
        secret: 'test-secret-that-is-long-enough-for-better-auth',
        baseURL: 'http://localhost:3000',
        trustedOrigins: ['http://localhost:5173'],
        sendEmail: vi.fn(),
      });
      await signIn(auth, headers).catch(() => undefined);
    } finally {
      vi.unstubAllEnvs();
    }
    return incremented;
  };

  it('keys the limit on the Cloudflare client IP', async () => {
    const keys = await keysFor({ 'cf-connecting-ip': '203.0.113.7' });
    expect(keys.some((key) => key.includes('203.0.113.7'))).toBe(true);
  });

  it('ignores a client-supplied X-Forwarded-For', async () => {
    const keys = await keysFor({
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.99',
    });
    expect(keys.some((key) => key.includes('198.51.100.99'))).toBe(false);
  });
});
