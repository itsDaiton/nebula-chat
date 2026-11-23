import { and, eq } from 'drizzle-orm';
import { ownKeys } from '@nebula-chat/db';
import type { OwnKeyProvider, OwnKeyStatus } from '@nebula-chat/db';
import { db } from '@server/db';

export type OwnKeyRow = {
  id: string;
  provider: OwnKeyProvider;
  lastFour: string;
  status: OwnKeyStatus;
  updatedAt: Date;
};

// Never selects the ciphertext: the server has no use for it after the write.
const columns = {
  id: ownKeys.id,
  provider: ownKeys.provider,
  lastFour: ownKeys.lastFour,
  status: ownKeys.status,
  updatedAt: ownKeys.updatedAt,
};

export type StoredOwnKey = { ciphertext: string; keyVersion: number; lastFour: string };

export const ownKeyRepository = {
  list(userId: string): Promise<OwnKeyRow[]> {
    return db.select(columns).from(ownKeys).where(eq(ownKeys.userId, userId));
  },
  /** Stores or replaces the User's key for a provider; a replaced key goes back to `pending`. */
  async save(userId: string, provider: OwnKeyProvider, stored: StoredOwnKey): Promise<OwnKeyRow> {
    const [row] = await db
      .insert(ownKeys)
      .values({ userId, provider, ...stored })
      .onConflictDoUpdate({
        target: [ownKeys.userId, ownKeys.provider],
        set: { ...stored, status: 'pending', updatedAt: new Date() },
      })
      .returning(columns);
    if (!row) throw new Error('Own key upsert returned no row');
    return row;
  },
  /** The keys a Model call may use: `pending` and `invalid` ones are left out. */
  findValid(userId: string): Promise<{ id: string; provider: OwnKeyProvider }[]> {
    return db
      .select({ id: ownKeys.id, provider: ownKeys.provider })
      .from(ownKeys)
      .where(and(eq(ownKeys.userId, userId), eq(ownKeys.status, 'valid')));
  },
  async remove(userId: string, provider: OwnKeyProvider): Promise<void> {
    await db.delete(ownKeys).where(and(eq(ownKeys.userId, userId), eq(ownKeys.provider, provider)));
  },
};
