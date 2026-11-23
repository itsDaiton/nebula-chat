import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encryptOwnKey } from '@server/modules/ownKey/ownKey.crypto';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

describe('encryptOwnKey', () => {
  it('produces base64 ciphertext only the matching private key decrypts with OAEP-SHA256', () => {
    const ciphertext = encryptOwnKey('sk-test-1234567890', publicKey);

    expect(ciphertext).not.toContain('sk-test');
    const plain = privateDecrypt(
      { key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      Buffer.from(ciphertext, 'base64'),
    );
    expect(plain.toString('utf8')).toBe('sk-test-1234567890');
  });

  it('is randomised, so the same key never yields the same ciphertext', () => {
    expect(encryptOwnKey('sk-same-key-0000', publicKey)).not.toBe(
      encryptOwnKey('sk-same-key-0000', publicKey),
    );
  });
});
