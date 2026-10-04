import { eq } from 'drizzle-orm';
import { users } from '@nebula-chat/db';
import type { DbClient } from '@nebula-chat/db';

/** Marks a user's email verified — a completed password reset proves they own it. */
export const markEmailVerified = async (db: DbClient, userId: string): Promise<void> => {
  await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
};
