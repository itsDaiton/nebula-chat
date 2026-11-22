import { and, eq, ne } from 'drizzle-orm';
import { ownKeys } from '@nebula-chat/db';
import { db } from '@worker/db';
import type { OwnKeyStore } from '@worker/ownKeys/ownKeyStore';

const columns = {
  id: ownKeys.id,
  userId: ownKeys.userId,
  provider: ownKeys.provider,
  ciphertext: ownKeys.ciphertext,
  keyVersion: ownKeys.keyVersion,
  status: ownKeys.status,
};

export const ownKeyRepository: OwnKeyStore = {
  async find(id) {
    const [row] = await db.select(columns).from(ownKeys).where(eq(ownKeys.id, id));
    return row ?? null;
  },
  async setStatus(key, status) {
    await db
      .update(ownKeys)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(ownKeys.id, key.id), eq(ownKeys.ciphertext, key.ciphertext)));
  },
  findNotAtVersion: (version) =>
    db.select(columns).from(ownKeys).where(ne(ownKeys.keyVersion, version)),
  async replaceCiphertext(key, next) {
    const updated = await db
      .update(ownKeys)
      .set({ ...next, updatedAt: new Date() })
      .where(
        and(
          eq(ownKeys.id, key.id),
          eq(ownKeys.ciphertext, key.ciphertext),
          eq(ownKeys.keyVersion, key.keyVersion),
        ),
      )
      .returning({ id: ownKeys.id });
    return updated.length > 0;
  },
};
