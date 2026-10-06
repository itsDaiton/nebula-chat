import { describe, expect, it } from 'vitest';
import { socialProvidersFromEnv } from '@backend/utils/socialProviders';

const GOOGLE = { GOOGLE_CLIENT_ID: 'google-id', GOOGLE_CLIENT_SECRET: 'google-secret' };
const GITHUB = { GITHUB_CLIENT_ID: 'github-id', GITHUB_CLIENT_SECRET: 'github-secret' };

describe('socialProvidersFromEnv', () => {
  it('enables both providers when both are configured', () => {
    expect(socialProvidersFromEnv({ ...GOOGLE, ...GITHUB })).toEqual({
      google: { clientId: 'google-id', clientSecret: 'google-secret' },
      github: { clientId: 'github-id', clientSecret: 'github-secret' },
    });
  });

  it('enables only the configured provider', () => {
    expect(socialProvidersFromEnv(GITHUB)).toEqual({
      github: { clientId: 'github-id', clientSecret: 'github-secret' },
    });
  });

  it('enables none when no provider is configured', () => {
    expect(socialProvidersFromEnv({})).toEqual({});
  });
});
