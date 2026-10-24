import { eq } from 'drizzle-orm';
import { sessions } from '@nebula-chat/db';
import type { DbClient } from '@nebula-chat/db';

export type ClaimSessionsParams = {
  /** The anonymous Guest user whose sessions are being claimed. */
  fromUserId: string;
  /** The newly linked (Registered) user the sessions move to. */
  toUserId: string;
};

/**
 * Reassigns every `sessions.userId` from the anonymous user to the newly linked one (ADR-0010 §2).
 * Run from `onLinkAccount` before the anonymous row is cleaned up; its own file so it is testable apart from the SDK.
 */
export const claimSessions = async (
  db: DbClient,
  { fromUserId, toUserId }: ClaimSessionsParams,
): Promise<void> => {
  await db.update(sessions).set({ userId: toUserId }).where(eq(sessions.userId, fromUserId));
};
