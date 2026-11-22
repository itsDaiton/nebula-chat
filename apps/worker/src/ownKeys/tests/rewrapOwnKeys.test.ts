import { beforeEach, describe, expect, it } from 'vitest';
import { captureLogger, eventLines } from '@nebula-chat/otel/testing';
import { createOwnKeyRewrapProcessor } from '@worker/jobs/ownKeyRewrap';
import { createOwnKeyCrypto } from '@worker/ownKeys/ownKeyCrypto';
import {
  cryptoFor,
  encryptOwnKey,
  generateKeyPair,
  memoryOwnKeys,
} from '@worker/ownKeys/tests/ownKeyFakes';

const USER = '11111111-1111-4111-8111-111111111111';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const v1 = generateKeyPair();
const v2 = generateKeyPair();
const both = cryptoFor({ 1: v1, 2: v2 });

let own: ReturnType<typeof memoryOwnKeys>;
let log: ReturnType<typeof captureLogger>;

const rewrap = (crypto = both) =>
  createOwnKeyRewrapProcessor({ store: own.store, crypto, logger: log.logger })({
    id: 'j',
    data: {},
  });
const plaintextOf = (id: string) => {
  const row = own.rows.get(id)!;
  return both.decrypt(row.ciphertext, row.keyVersion);
};

beforeEach(() => {
  own = memoryOwnKeys();
  log = captureLogger();
  own.add(A, { userId: USER, provider: 'openai', ciphertext: encryptOwnKey(v1.publicKey, 'sk-a') });
  own.add(B, {
    userId: USER,
    provider: 'anthropic',
    ciphertext: encryptOwnKey(v1.publicKey, 'sk-b'),
  });
});

describe('the Own key re-wrap job', () => {
  it('re-encrypts every key to the current version, keeping each key', async () => {
    await rewrap();

    expect([own.rows.get(A)?.keyVersion, own.rows.get(B)?.keyVersion]).toEqual([2, 2]);
    expect([plaintextOf(A), plaintextOf(B)]).toEqual(['sk-a', 'sk-b']);
  });

  it('keeps a key’s status through the re-wrap', async () => {
    own.rows.get(A)!.status = 'invalid';

    await rewrap();

    expect(own.rows.get(A)?.status).toBe('invalid');
  });

  it('is idempotent: a second run changes nothing', async () => {
    await rewrap();
    const after = structuredClone([...own.rows.values()]);

    await rewrap();

    expect([...own.rows.values()]).toEqual(after);
  });

  it('leaves a key already at the current version alone', async () => {
    const ciphertext = encryptOwnKey(v2.publicKey, 'sk-c');
    own.add(C, { userId: USER, provider: 'openai', ciphertext, keyVersion: 2 });

    await rewrap();

    expect(own.rows.get(C)?.ciphertext).toBe(ciphertext);
  });

  it('re-wraps the rest after a key fails, throws so the job retries, and a rerun finishes it', async () => {
    own.add(C, { userId: USER, provider: 'openai', ciphertext: 'AAAA' });

    await expect(rewrap()).rejects.toThrow(/1 Own key/);
    expect([own.rows.get(A)?.keyVersion, own.rows.get(B)?.keyVersion]).toEqual([2, 2]);
    expect(own.rows.get(C)?.keyVersion).toBe(1);

    own.rows.get(C)!.ciphertext = encryptOwnKey(v1.publicKey, 'sk-c');
    await rewrap();

    expect(plaintextOf(C)).toBe('sk-c');
  });

  it('leaves a key replaced while it was being re-wrapped', async () => {
    const replacement = encryptOwnKey(v2.publicKey, 'sk-new');
    const realReplace = own.store.replaceCiphertext;
    own.store.replaceCiphertext = async (key, next) => {
      if (key.id === A) Object.assign(own.rows.get(A)!, { ciphertext: replacement, keyVersion: 2 });
      return realReplace(key, next);
    };

    await rewrap();

    expect(plaintextOf(A)).toBe('sk-new');
  });

  it('fails every key, without touching any, when the current private key is missing', async () => {
    const noCurrent = createOwnKeyCrypto({
      privateKeys: new Map([[1, v1.privateKey]]),
      currentVersion: 2,
    });

    await expect(rewrap(noCurrent)).rejects.toThrow(/2 Own key/);
    expect(own.rows.get(A)?.keyVersion).toBe(1);
  });

  it('logs counts and ids, never a key or ciphertext', async () => {
    await rewrap();

    expect(eventLines(log.lines, 'own_key.rewrap.completed')).toHaveLength(1);
    const logged = JSON.stringify(log.lines);
    expect(logged).not.toContain('sk-a');
    expect(logged).not.toContain(own.rows.get(A)!.ciphertext);
  });

  it('drops a payload that breaks the contract', async () => {
    await createOwnKeyRewrapProcessor({ store: own.store, crypto: both, logger: log.logger })({
      id: 'j',
      data: 'nope',
    });

    expect(eventLines(log.lines, 'job.payload.rejected')).toHaveLength(1);
  });
});
