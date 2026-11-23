import { constants, publicEncrypt } from 'node:crypto';

/** The contract with the worker's decryption: RSA-OAEP, SHA-256 for the hash and MGF1, base64 ciphertext. */
export const encryptOwnKey = (key: string, publicKeyPem: string): string =>
  publicEncrypt(
    { key: publicKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(key),
  ).toString('base64');
