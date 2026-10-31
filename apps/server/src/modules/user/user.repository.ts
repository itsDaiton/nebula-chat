import { eq } from 'drizzle-orm';
import { users } from '@nebula-chat/db';
import { db } from '@server/db';

export const userRepository = {
  async findPendingDeletion(id: string) {
    const [row] = await db
      .select({ id: users.id, pendingDeletionAt: users.pendingDeletionAt })
      .from(users)
      .where(eq(users.id, id));
    return row ?? null;
  },
  async clearPendingDeletion(id: string) {
    await db.update(users).set({ pendingDeletionAt: null }).where(eq(users.id, id));
  },
};
