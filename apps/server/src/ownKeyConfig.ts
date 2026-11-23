import { env } from '@server/env';

/** The worker public key and its version, or `null` while Own keys are switched off. */
export const ownKeyConfig: { publicKey: string; version: number } | null =
  env.OWN_KEY_PUBLIC_KEY && env.OWN_KEY_VERSION
    ? { publicKey: env.OWN_KEY_PUBLIC_KEY, version: env.OWN_KEY_VERSION }
    : null;
