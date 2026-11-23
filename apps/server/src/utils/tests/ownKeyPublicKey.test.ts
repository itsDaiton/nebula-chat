import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { checkOwnKeyPair, ownKeyPublicKeySchema } from '@server/utils/ownKeyPublicKey';

const pem = (modulusLength: number) =>
  generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }).publicKey;

const schema = z
  .object({
    OWN_KEY_PUBLIC_KEY: ownKeyPublicKeySchema,
    OWN_KEY_VERSION: z.coerce.number().optional(),
  })
  .check(checkOwnKeyPair);

describe('ownKeyPublicKeySchema', () => {
  const key = pem(4096);

  it('accepts a 4096-bit RSA public key, with `\\n` standing for line breaks', () => {
    expect(ownKeyPublicKeySchema.parse(key.replaceAll('\n', '\\n'))).toBe(key);
  });

  it('rejects a smaller key and garbage', () => {
    expect(ownKeyPublicKeySchema.safeParse(pem(2048)).success).toBe(false);
    expect(ownKeyPublicKeySchema.safeParse('not a key').success).toBe(false);
  });

  it('reads an empty value as unset', () => {
    expect(ownKeyPublicKeySchema.parse('')).toBeUndefined();
  });

  it('needs the key and its version together', () => {
    expect(schema.safeParse({ OWN_KEY_PUBLIC_KEY: key }).success).toBe(false);
    expect(schema.safeParse({ OWN_KEY_VERSION: '1' }).success).toBe(false);
    expect(schema.safeParse({ OWN_KEY_PUBLIC_KEY: key, OWN_KEY_VERSION: '1' }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(true);
  });
});
