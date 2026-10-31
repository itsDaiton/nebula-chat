import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { auditEntries, modelCalls, users } from '@nebula-chat/db';
import { db } from '@worker/db';
import type { PurgeCutoffs, PurgeStore } from '@worker/purge/runPurge';

const pendingExpired = (c: PurgeCutoffs) => lt(users.pendingDeletionAt, c.pendingDeletionBefore);

const guestInactive = (c: PurgeCutoffs) =>
  and(
    eq(users.isAnonymous, true),
    isNull(users.pendingDeletionAt),
    lt(sql`coalesce(${users.lastActiveAt}, ${users.createdAt})`, c.guestInactiveBefore),
  );

/** The Postgres `PurgeStore`. Sessions, Messages and Runs go with the User row by cascade. */
export const purgeRepository: PurgeStore = {
  async findDue(cutoffs) {
    const [pending, guests] = await Promise.all([
      db.select({ id: users.id }).from(users).where(pendingExpired(cutoffs)),
      db.select({ id: users.id }).from(users).where(guestInactive(cutoffs)),
    ]);
    return { pendingUserIds: pending.map((u) => u.id), guestIds: guests.map((u) => u.id) };
  },
  async purgeUser(userId, cutoffs) {
    return db.transaction(async (tx) => {
      // Locked and re-checked, so a User restored since the scan keeps their data.
      const [due] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), or(pendingExpired(cutoffs), guestInactive(cutoffs))))
        .for('update');
      if (!due) return false;
      await tx.update(modelCalls).set({ userId: null }).where(eq(modelCalls.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
      return true;
    });
  },
  async appendAudit(counts) {
    await db.insert(auditEntries).values({
      actorType: 'system',
      action: 'users.purged',
      targetType: 'users',
      targetId: 'purge',
      detail: counts,
    });
  },
};
