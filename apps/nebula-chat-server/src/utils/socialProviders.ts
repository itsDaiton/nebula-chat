import { z } from 'zod';
import type { OAuthCredentials, SocialProviderCredentials } from '@nebula-chat/auth';

/** One half of a provider's OAuth app; empty counts as unset, since `.env.example` ships them blank. */
export const oauthCredentialSchema = z.preprocess(
  (raw) => (raw === '' ? undefined : raw),
  z.string().min(1).optional(),
);

type SocialProviderEnv = {
  GOOGLE_CLIENT_ID?: string | undefined;
  GOOGLE_CLIENT_SECRET?: string | undefined;
  GITHUB_CLIENT_ID?: string | undefined;
  GITHUB_CLIENT_SECRET?: string | undefined;
};

const credentials = (
  clientId?: string | undefined,
  clientSecret?: string | undefined,
): OAuthCredentials | undefined =>
  clientId && clientSecret ? { clientId, clientSecret } : undefined;

/** The providers whose OAuth app is configured; the env schema rejects a half-configured one. */
export const socialProvidersFromEnv = (env: SocialProviderEnv): SocialProviderCredentials => {
  const google = credentials(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  const github = credentials(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);
  return { ...(google && { google }), ...(github && { github }) };
};
