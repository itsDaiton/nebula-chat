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
  } as AuthStore;
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
});
