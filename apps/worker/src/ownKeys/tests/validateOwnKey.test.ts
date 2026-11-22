import { beforeEach, describe, expect, it } from 'vitest';
import { captureLogger, eventLines } from '@nebula-chat/otel/testing';
import { createOwnKeyValidationProcessor } from '@worker/jobs/ownKeyValidation';
import type { ProviderKeyCheck } from '@worker/ownKeys/checkProviderKey';
import {
  cryptoFor,
  encryptOwnKey,
  generateKeyPair,
  memoryOwnKeys,
} from '@worker/ownKeys/tests/ownKeyFakes';

const ID = '66666666-6666-4666-8666-666666666666';
const USER = '11111111-1111-4111-8111-111111111111';
const SENTINEL = 'sk-validate-sentinel-0000';
const pair = generateKeyPair();

let own: ReturnType<typeof memoryOwnKeys>;
let log: ReturnType<typeof captureLogger>;
let seen: { provider: string; apiKey: string }[];

const processor = (answer: 'valid' | 'invalid' | Error) =>
  createOwnKeyValidationProcessor({
    store: own.store,
    crypto: cryptoFor({ 1: pair }),
    check: (async (provider, apiKey) => {
      seen.push({ provider, apiKey });
      if (answer instanceof Error) throw answer;
      return answer;
    }) satisfies ProviderKeyCheck,
    logger: log.logger,
  });

const stored = (provider: 'openai' | 'anthropic' = 'openai', ciphertext?: string) =>
  own.add(ID, {
    userId: USER,
    provider,
    status: 'pending',
    ciphertext: ciphertext ?? encryptOwnKey(pair.publicKey, SENTINEL),
  });

beforeEach(() => {
  own = memoryOwnKeys();
  log = captureLogger();
  seen = [];
});

describe('the Own key validation job', () => {
  it.each(['openai', 'anthropic'] as const)(
    'records a key its %s provider accepts as valid',
    async (provider) => {
      stored(provider);

      await processor('valid')({ id: 'j', data: { ownKeyId: ID } });

      expect(own.rows.get(ID)?.status).toBe('valid');
      expect(seen).toEqual([{ provider, apiKey: SENTINEL }]);
    },
  );

  it('records a key its provider rejects as invalid', async () => {
    stored();

    await processor('invalid')({ id: 'j', data: { ownKeyId: ID } });

    expect(own.rows.get(ID)?.status).toBe('invalid');
  });

  it('records an unreadable key as invalid without asking the provider', async () => {
    stored('openai', 'AAAA');

    await processor('valid')({ id: 'j', data: { ownKeyId: ID } });

    expect(own.rows.get(ID)?.status).toBe('invalid');
    expect(seen).toEqual([]);
  });

  it('throws when the provider cannot answer, leaving the key as it was for the retry', async () => {
    stored();

    await expect(processor(new Error('503'))({ id: 'j', data: { ownKeyId: ID } })).rejects.toThrow(
      '503',
    );
    expect(own.rows.get(ID)?.status).toBe('pending');
  });

  it('does nothing for a key removed since the job was enqueued', async () => {
    await processor('valid')({ id: 'j', data: { ownKeyId: ID } });

    expect(seen).toEqual([]);
  });

  it('drops a payload that breaks the contract', async () => {
    await processor('valid')({ id: 'j', data: { ownKeyId: 'nope' } });

    expect(eventLines(log.lines, 'job.payload.rejected')).toHaveLength(1);
  });

  it('logs the outcome by id, never the key', async () => {
    stored();

    await processor('valid')({ id: 'j', data: { ownKeyId: ID } });

    expect(eventLines(log.lines, 'own_key.validated')).toHaveLength(1);
    expect(JSON.stringify(log.lines)).not.toContain(SENTINEL);
  });
});
