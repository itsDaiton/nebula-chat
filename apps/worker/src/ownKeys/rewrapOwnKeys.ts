import { logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import type { OwnKeyCrypto } from '@worker/ownKeys/ownKeyCrypto';
import type { OwnKeyStore } from '@worker/ownKeys/ownKeyStore';

export type RewrapDeps = { store: OwnKeyStore; crypto: OwnKeyCrypto; logger: Logger };

/** Re-encrypts every key not at the current version; returns how many it could not, which a rerun picks up again. */
export const rewrapOwnKeys = async ({ store, crypto, logger }: RewrapDeps): Promise<number> => {
  const stale = await store.findNotAtVersion(crypto.currentVersion);
  let rewrapped = 0;
  let failed = 0;
  for (const key of stale) {
    try {
      const ciphertext = crypto.rewrap(key.ciphertext, key.keyVersion);
      // False means the key was replaced meanwhile: the replacement is already at the server's current version.
      if (await store.replaceCiphertext(key, { ciphertext, keyVersion: crypto.currentVersion })) {
        rewrapped++;
      }
    } catch (err) {
      failed++;
      logEvent(
        logger,
        'warn',
        'own_key.rewrap.failed',
        { 'nebula.own_key.id': key.id, err },
        'Own key could not be re-wrapped; a rerun tries it again',
      );
    }
  }
  logEvent(
    logger,
    'info',
    'own_key.rewrap.completed',
    { 'nebula.own_key.rewrapped': rewrapped, 'nebula.own_key.failed': failed },
    'Own key re-wrap finished',
  );
  return failed;
};
