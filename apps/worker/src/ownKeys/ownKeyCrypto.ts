import {
  constants,
  createPrivateKey,
  createPublicKey,
  privateDecrypt,
  publicEncrypt,
} from 'node:crypto';
import type { KeyObject } from 'node:crypto';

/** The contract with the server's encryption: RSA-OAEP, SHA-256 for the hash and MGF1, base64 ciphertext. */
const OAEP = { padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' } as const;

export type OwnKeyCrypto = {
  /** The version new ciphertext is written under. */
  currentVersion: number;
  /** Throws when `version` has no private key here, or the ciphertext does not decrypt under it. */
  decrypt: (ciphertext: string, version: number) => string;
  /** Re-encrypts `ciphertext` from `version` to the current version. */
  rewrap: (ciphertext: string, version: number) => string;
};

export type OwnKeyCryptoConfig = {
  /** A PEM private key per key version; the worker needs the old and new at once during a rotation. */
  privateKeys: ReadonlyMap<number, string>;
  currentVersion: number;
};

export const createOwnKeyCrypto = ({
  privateKeys,
  currentVersion,
}: OwnKeyCryptoConfig): OwnKeyCrypto => {
  const keys = new Map<number, KeyObject>(
    [...privateKeys].map(([version, pem]) => [version, createPrivateKey(pem)]),
  );
  const decrypt = (ciphertext: string, version: number): string => {
    const key = keys.get(version);
    if (!key) throw new Error(`No private key for Own key version ${version}`);
    return privateDecrypt({ key, ...OAEP }, Buffer.from(ciphertext, 'base64')).toString('utf8');
  };
  return {
    currentVersion,
    decrypt,
    rewrap: (ciphertext, version) => {
      const current = keys.get(currentVersion);
      if (!current)
        throw new Error(`No private key for the current Own key version ${currentVersion}`);
      // The public half is derived, so the worker needs one secret per version and no second variable.
      return publicEncrypt(
        { key: createPublicKey(current), ...OAEP },
        Buffer.from(decrypt(ciphertext, version)),
      ).toString('base64');
    },
  };
};
