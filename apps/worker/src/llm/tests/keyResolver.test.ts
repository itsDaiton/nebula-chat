import { beforeEach, describe, expect, it } from 'vitest';
import { InvalidOwnKeyError, MissingConfigurationError } from '@nebula-chat/errors';
import { createKeyResolver, operatorKeyResolver } from '@worker/llm/keyResolver';
import {
  cryptoFor,
  encryptOwnKey,
  generateKeyPair,
  memoryOwnKeys,
} from '@worker/ownKeys/tests/ownKeyFakes';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER_USER = '22222222-2222-4222-8222-222222222222';
const REF = '66666666-6666-4666-8666-666666666666';
const OWN = 'sk-own-sentinel-0000';

describe('operatorKeyResolver', () => {
  const keys = operatorKeyResolver({ openai: 'sk-openai', anthropic: undefined })({ userId: USER });

  it('returns the Operator key of a configured provider', async () => {
    expect(await keys.keyFor('openai')).toBe('sk-openai');
  });

  it('throws MissingConfigurationError naming the env variable for an unconfigured provider', async () => {
    await expect(keys.keyFor('anthropic')).rejects.toThrow(MissingConfigurationError);
    await expect(keys.keyFor('anthropic')).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it('lists only the key values that are configured', () => {
    expect(keys.knownKeys()).toEqual(['sk-openai']);
  });

  it('fails a job that names an Own key it has no store for, rather than using the Operator key', async () => {
    const named = operatorKeyResolver({ openai: 'sk-openai' })({
      userId: USER,
      keyRefs: { openai: REF },
    });

    await expect(named.keyFor('openai')).rejects.toThrow(InvalidOwnKeyError);
  });
});

describe('an Own key resolver', () => {
  const pair = generateKeyPair();
  const crypto = cryptoFor({ 1: pair });
  let own: ReturnType<typeof memoryOwnKeys>;
  const resolver = (keyRefs: { openai?: string; anthropic?: string } | undefined, userId = USER) =>
    createKeyResolver(
      { openai: 'sk-operator', anthropic: 'sk-ant-operator' },
      { store: own.store, crypto },
    )({
      userId,
      keyRefs,
    });
  const store = (overrides: Partial<Parameters<typeof own.add>[1]> = {}) =>
    own.add(REF, {
      userId: USER,
      provider: 'openai',
      ciphertext: encryptOwnKey(pair.publicKey, OWN),
      ...overrides,
    });

  beforeEach(() => {
    own = memoryOwnKeys();
  });

  it('uses the stored key of a provider the job names, and the Operator key for one it does not', async () => {
    store();
    const keys = resolver({ openai: REF });

    expect(await keys.keyFor('openai')).toBe(OWN);
    expect(await keys.keyFor('anthropic')).toBe('sk-ant-operator');
    expect([keys.isOwn('openai'), keys.isOwn('anthropic')]).toEqual([true, false]);
  });

  it('uses the Operator key when the job names no reference', async () => {
    store();

    expect(await resolver(undefined).keyFor('openai')).toBe('sk-operator');
  });

  it.each([
    ['gone', () => undefined],
    ['pending validation', () => store({ status: 'pending' })],
    ['invalid', () => store({ status: 'invalid' })],
    ['another User’s', () => store({ userId: OTHER_USER })],
    ['another provider’s', () => store({ provider: 'anthropic' })],
    ['at a version with no private key', () => store({ keyVersion: 9 })],
    ['tampered', () => store({ ciphertext: 'AAAA' })],
  ])(
    'fails with the typed error, never the Operator key, for a key that is %s',
    async (_, setup) => {
      setup();

      await expect(resolver({ openai: REF }).keyFor('openai')).rejects.toThrow(InvalidOwnKeyError);
    },
  );

  it('loads the key afresh on every call, so a replaced key is used at once', async () => {
    store();
    const keys = resolver({ openai: REF });
    await keys.keyFor('openai');

    store({ ciphertext: encryptOwnKey(pair.publicKey, 'sk-replacement') });

    expect(await keys.keyFor('openai')).toBe('sk-replacement');
  });

  it('knows a key it loaded, so error text can be scrubbed of it', async () => {
    store();
    const keys = resolver({ openai: REF });
    expect(keys.knownKeys()).not.toContain(OWN);

    await keys.keyFor('openai');

    expect(keys.knownKeys()).toContain(OWN);
  });

  describe('guard', () => {
    const failing = (status: number) => Object.assign(new Error('provider said no'), { status });

    it('marks the key invalid on an authentication failure and fails with the typed error', async () => {
      store();
      const keys = resolver({ openai: REF });
      await keys.keyFor('openai');

      await expect(keys.guard('openai', () => Promise.reject(failing(401)))).rejects.toThrow(
        InvalidOwnKeyError,
      );
      expect(own.rows.get(REF)?.status).toBe('invalid');
    });

    it('leaves the key valid on a quota or rate-limit failure, and fails with a reason', async () => {
      store();
      const keys = resolver({ openai: REF });
      await keys.keyFor('openai');

      await expect(keys.guard('openai', () => Promise.reject(failing(429)))).rejects.toMatchObject({
        code: 'TooManyRequests',
      });
      expect(own.rows.get(REF)?.status).toBe('valid');
    });

    it('recognises an authentication failure wrapped as a cause', async () => {
      store();
      const keys = resolver({ openai: REF });
      await keys.keyFor('openai');

      await expect(
        keys.guard('openai', () => Promise.reject(new Error('wrapped', { cause: failing(401) }))),
      ).rejects.toThrow(InvalidOwnKeyError);
    });

    it('does not mark a key replaced after it was loaded', async () => {
      store();
      const keys = resolver({ openai: REF });
      await keys.keyFor('openai');
      store({ ciphertext: encryptOwnKey(pair.publicKey, 'sk-replacement'), status: 'pending' });

      await expect(keys.guard('openai', () => Promise.reject(failing(401)))).rejects.toThrow();
      expect(own.rows.get(REF)?.status).toBe('pending');
    });

    it('passes an Operator key failure through untouched', async () => {
      const keys = resolver(undefined);
      const error = failing(401);

      await expect(keys.guard('openai', () => Promise.reject(error))).rejects.toBe(error);
    });

    it('passes any other Own key failure through untouched', async () => {
      store();
      const keys = resolver({ openai: REF });
      await keys.keyFor('openai');
      const error = failing(500);

      await expect(keys.guard('openai', () => Promise.reject(error))).rejects.toBe(error);
      expect(own.rows.get(REF)?.status).toBe('valid');
    });
  });
});
