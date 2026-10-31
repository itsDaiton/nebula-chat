import { eq } from 'drizzle-orm';
import { users } from '@nebula-chat/db';
import { db } from '@server/db';

export const userRepository = {
  async findLastActiveAt(userId: string): Promise<Date | null> {
    const [row] = await db
      .select({ lastActiveAt: users.lastActiveAt })
      .from(users)
      .where(eq(users.id, userId));
    return row?.lastActiveAt ?? null;
  },
  async setLastActiveAt(userId: string, at: Date): Promise<void> {
    await db.update(users).set({ lastActiveAt: at }).where(eq(users.id, userId));
  },
};
