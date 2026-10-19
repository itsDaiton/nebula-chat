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
 * Claim a Guest's sessions into a real account: reassign every
 * `sessions.userId` from the anonymous user to the newly linked user.
 *
 * Run from the anonymous plugin's `onLinkAccount` hook BEFORE the anonymous row
 * is cleaned up (ADR-0010 §2). Extracted into its own file so the claim is a
 * real, directly-testable seam independent of the better-auth SDK wiring.
 */
export const claimSessions = async (
  db: DbClient,
  { fromUserId, toUserId }: ClaimSessionsParams,
): Promise<void> => {
  await db.update(sessions).set({ userId: toUserId }).where(eq(sessions.userId, fromUserId));
};
