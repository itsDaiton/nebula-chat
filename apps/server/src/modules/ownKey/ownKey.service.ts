import { NotFoundError } from '@nebula-chat/errors';
import type { EventLogger } from '@nebula-chat/otel';
import type { OwnKeyProvider } from '@nebula-chat/db';
import { encryptOwnKey } from '@server/modules/ownKey/ownKey.crypto';
import { ownKeyRepository } from '@server/modules/ownKey/ownKey.repository';
import type { OwnKeyRow } from '@server/modules/ownKey/ownKey.repository';
import type { OwnKeyDTO, OwnKeyListDTO } from '@server/modules/ownKey/ownKey.types';
import { ownKeyConfig } from '@server/ownKeyConfig';
import { enqueueOwnKeyValidation } from '@server/queue';

const toDTO = ({ provider, lastFour, status, updatedAt }: OwnKeyRow): OwnKeyDTO => ({
  provider,
  lastFour,
  status,
  updatedAt: updatedAt.toISOString(),
});

export const ownKeyService = {
  async list(userId: string): Promise<OwnKeyListDTO> {
    const rows = await ownKeyRepository.list(userId);
    return { enabled: ownKeyConfig !== null, keys: rows.map(toDTO) };
  },

  /** Encrypts to the worker public key, stores the ciphertext and has the worker validate it; the plaintext goes nowhere else. */
  async save(
    userId: string,
    provider: OwnKeyProvider,
    key: string,
    logger: EventLogger<'warn'>,
  ): Promise<OwnKeyDTO> {
    if (!ownKeyConfig) throw new NotFoundError('Own key storage');
    const row = await ownKeyRepository.save(userId, provider, {
      ciphertext: encryptOwnKey(key, ownKeyConfig.publicKey),
      keyVersion: ownKeyConfig.version,
      lastFour: key.slice(-4),
    });
    await enqueueOwnKeyValidation({ ownKeyId: row.id }, logger);
    return toDTO(row);
  },

  /** Succeeds when there is none, and works with storage off. */
  async remove(userId: string, provider: OwnKeyProvider): Promise<void> {
    await ownKeyRepository.remove(userId, provider);
  },
};
