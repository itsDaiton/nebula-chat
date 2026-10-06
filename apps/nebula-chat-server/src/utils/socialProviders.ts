import { z } from 'zod';
import type { SocialProviderCredentials } from '@nebula-chat/auth';

/** One half of a provider's OAuth app; empty counts as unset, since `.env.example` ships them blank. */
export const oauthCredentialSchema = z.preprocess(
  (raw) => (raw === '' ? undefined : raw),
  z.string().min(1).optional(),
);

// The env vars holding each provider's OAuth app.
const SOCIAL_PROVIDER_ENV = {
  google: { clientId: 'GOOGLE_CLIENT_ID', clientSecret: 'GOOGLE_CLIENT_SECRET' },
  github: { clientId: 'GITHUB_CLIENT_ID', clientSecret: 'GITHUB_CLIENT_SECRET' },
} as const;

type SocialProviderEnvKey = (typeof SOCIAL_PROVIDER_ENV)[keyof typeof SOCIAL_PROVIDER_ENV][
  'clientId' | 'clientSecret'];

type SocialProviderEnv = Partial<Record<SocialProviderEnvKey, string | undefined>>;

/** Fails boot on a provider with only one of its id and secret set. */
export const checkSocialProviderPairs = (ctx: z.core.ParsePayload<SocialProviderEnv>) => {
  for (const { clientId, clientSecret } of Object.values(SOCIAL_PROVIDER_ENV)) {
    if ((ctx.value[clientId] === undefined) !== (ctx.value[clientSecret] === undefined)) {
      ctx.issues.push({
        code: 'custom',
        message: `Set both ${clientId} and ${clientSecret}, or neither`,
        input: ctx.value,
      });
    }
  }
};

/** The providers whose OAuth app is configured. */
export const socialProvidersFromEnv = (env: SocialProviderEnv): SocialProviderCredentials =>
  Object.fromEntries(
    Object.entries(SOCIAL_PROVIDER_ENV).flatMap(([provider, keys]) => {
      const clientId = env[keys.clientId];
      const clientSecret = env[keys.clientSecret];
      return clientId && clientSecret ? [[provider, { clientId, clientSecret }]] : [];
    }),
  );
