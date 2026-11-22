import { describe, expect, it } from 'vitest';
import { createOwnKeyCrypto } from '@worker/ownKeys/ownKeyCrypto';
import { encryptOwnKey, generateKeyPair } from '@worker/ownKeys/tests/ownKeyFakes';

const SENTINEL = 'sk-test-sentinel-0000';
const v1 = generateKeyPair();
const v2 = generateKeyPair();
const both = createOwnKeyCrypto({
  privateKeys: new Map([
    [1, v1.privateKey],
    [2, v2.privateKey],
  ]),
  currentVersion: 2,
});

describe('createOwnKeyCrypto', () => {
  it('decrypts what the server encrypted to the public key of the version', () => {
    expect(both.decrypt(encryptOwnKey(v1.publicKey, SENTINEL), 1)).toBe(SENTINEL);
    expect(both.decrypt(encryptOwnKey(v2.publicKey, SENTINEL), 2)).toBe(SENTINEL);
  });

  it('reads a 4096-bit ciphertext of a long key, the size the contract requires', () => {
    const pair = generateKeyPair(4096);
    const long = `sk-proj-${'a'.repeat(200)}`;
    const crypto = createOwnKeyCrypto({
      privateKeys: new Map([[1, pair.privateKey]]),
      currentVersion: 1,
    });

    expect(crypto.decrypt(encryptOwnKey(pair.publicKey, long), 1)).toBe(long);
  });

  it('fails for a version it has no private key for', () => {
    expect(() => both.decrypt(encryptOwnKey(v1.publicKey, SENTINEL), 3)).toThrow(/version 3/);
  });

  it('fails for a ciphertext read under the wrong version', () => {
    expect(() => both.decrypt(encryptOwnKey(v1.publicKey, SENTINEL), 2)).toThrow();
  });

  it('fails for tampered ciphertext', () => {
    const bytes = Buffer.from(encryptOwnKey(v1.publicKey, SENTINEL), 'base64');
    bytes[10] = bytes[10]! ^ 0xff;

    expect(() => both.decrypt(bytes.toString('base64'), 1)).toThrow();
  });

  it('re-wraps a ciphertext to the current version, keeping the key', () => {
    const wrapped = both.rewrap(encryptOwnKey(v1.publicKey, SENTINEL), 1);

    expect(both.decrypt(wrapped, 2)).toBe(SENTINEL);
    expect(() => both.decrypt(wrapped, 1)).toThrow();
  });

  it('refuses to re-wrap when the current version has no private key', () => {
    const crypto = createOwnKeyCrypto({ privateKeys: new Map(), currentVersion: 0 });

    expect(() => crypto.rewrap('x', 1)).toThrow(/current Own key version/);
  });
});
