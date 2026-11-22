import { logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import type { ProviderKeyCheck } from '@worker/ownKeys/checkProviderKey';
import type { OwnKeyCrypto } from '@worker/ownKeys/ownKeyCrypto';
import type { OwnKeyStore } from '@worker/ownKeys/ownKeyStore';

export type ValidateOwnKeyDeps = {
  store: OwnKeyStore;
  crypto: OwnKeyCrypto;
  check: ProviderKeyCheck;
  logger: Logger;
};

/** Checks a stored key against its provider and records `valid` or `invalid`; a provider that cannot answer throws, leaving the key as it was. */
export const validateOwnKey = async (
  ownKeyId: string,
  { store, crypto, check, logger }: ValidateOwnKeyDeps,
): Promise<void> => {
  const key = await store.find(ownKeyId);
  // Removed since the job was enqueued: nothing to validate.
  if (!key) return;
  let apiKey: string | undefined;
  try {
    apiKey = crypto.decrypt(key.ciphertext, key.keyVersion);
  } catch {
    // An unreadable ciphertext (a lost private key, a tampered row) will not improve on a retry.
  }
  // A provider that cannot answer throws here, leaving the key as it was.
  const status = apiKey === undefined ? 'invalid' : await check(key.provider, apiKey);
  await store.setStatus(key, status);
  logEvent(
    logger,
    'info',
    'own_key.validated',
    { 'nebula.own_key.id': key.id, 'nebula.own_key.status': status },
    `Own key ${status}`,
  );
};
