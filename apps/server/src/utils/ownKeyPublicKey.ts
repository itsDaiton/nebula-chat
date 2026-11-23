import { createPublicKey } from 'node:crypto';
import { z } from 'zod';

// Matches the worker's OAEP-SHA256 encryption: a smaller key would cut the longest key a User can store.
const REQUIRED_MODULUS_BITS = 4096;

const isOwnKeyPublicKey = (pem: string): boolean => {
  try {
    const key = createPublicKey(pem);
    return (
      key.asymmetricKeyType === 'rsa' &&
      key.asymmetricKeyDetails?.modulusLength === REQUIRED_MODULUS_BITS
    );
  } catch {
    return false;
  }
};

const readPem = (raw: unknown): unknown => {
  if (raw === '') return undefined;
  return typeof raw === 'string' ? raw.replaceAll(String.raw`\n`, '\n') : raw;
};

/** `OWN_KEY_PUBLIC_KEY`: a 4096-bit RSA public PEM (`\n` accepted for line breaks), or unset to switch Own keys off. */
export const ownKeyPublicKeySchema = z.preprocess(
  readPem,
  z
    .string()
    .refine(isOwnKeyPublicKey, { message: 'Expected a 4096-bit RSA public key in PEM format' })
    .optional(),
);

type OwnKeyEnv = { OWN_KEY_PUBLIC_KEY?: string | undefined; OWN_KEY_VERSION?: number | undefined };

/** Fails boot when only one of the public key and its version is set. */
export const checkOwnKeyPair = (ctx: z.core.ParsePayload<OwnKeyEnv>) => {
  if ((ctx.value.OWN_KEY_PUBLIC_KEY === undefined) !== (ctx.value.OWN_KEY_VERSION === undefined)) {
    ctx.issues.push({
      code: 'custom',
      message: 'Set both OWN_KEY_PUBLIC_KEY and OWN_KEY_VERSION, or neither',
      input: ctx.value,
    });
  }
};
