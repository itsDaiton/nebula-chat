import { constants, generateKeyPairSync, publicEncrypt } from 'node:crypto';
import type { OwnKeyProvider, OwnKeyStatus } from '@nebula-chat/db';
import { createOwnKeyCrypto } from '@worker/ownKeys/ownKeyCrypto';
import type { OwnKeyStore, StoredOwnKey } from '@worker/ownKeys/ownKeyStore';

export type TestKeyPair = { publicKey: string; privateKey: string };

// 2048 bits keeps the suite quick; the 4096-bit contract has its own test.
export const generateKeyPair = (modulusLength = 2048): TestKeyPair => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
};

/** What the server will do in the next ticket: RSA-OAEP with SHA-256 for hash and MGF1, base64. */
export const encryptOwnKey = (publicKey: string, plaintext: string): string =>
  publicEncrypt(
    { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(plaintext),
  ).toString('base64');

/** Stored Own keys in memory, keyed by id; `unavailable` makes every read fail like a database outage. */
export const memoryOwnKeys = () => {
  const rows = new Map<string, StoredOwnKey>();
  const store: OwnKeyStore = {
    // Copies, as a database returns: a row read earlier must not change under its reader.
    find: async (id) => {
      const row = rows.get(id);
      return row ? { ...row } : null;
    },
    setStatus: async (key, status) => {
      const row = rows.get(key.id);
      if (row?.ciphertext === key.ciphertext) row.status = status;
    },
    findNotAtVersion: async (version) =>
      [...rows.values()].filter((r) => r.keyVersion !== version).map((r) => ({ ...r })),
    replaceCiphertext: async (key, next) => {
      const row = rows.get(key.id);
      if (row?.ciphertext !== key.ciphertext || row.keyVersion !== key.keyVersion) return false;
      Object.assign(row, next);
      return true;
    },
  };
  const add = (
    id: string,
    row: {
      userId: string;
      provider: OwnKeyProvider;
      ciphertext: string;
      keyVersion?: number;
      status?: OwnKeyStatus;
    },
  ): StoredOwnKey => {
    const stored = { id, keyVersion: 1, status: 'valid' as const, ...row };
    rows.set(id, stored);
    return stored;
  };
  return { store, rows, add };
};

/** A worker holding the private keys of `versions`, the highest being current. */
export const cryptoFor = (versions: Record<number, TestKeyPair>) =>
  createOwnKeyCrypto({
    privateKeys: new Map(Object.entries(versions).map(([v, pair]) => [Number(v), pair.privateKey])),
    currentVersion: Math.max(...Object.keys(versions).map(Number)),
  });
