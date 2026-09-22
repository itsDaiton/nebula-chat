import { eq } from 'drizzle-orm';
import { conversations } from '@nebula-chat/db';
import type { DbClient } from '@nebula-chat/db';

export type ClaimConversationsParams = {
  /** The anonymous Guest user whose conversations are being claimed. */
  fromUserId: string;
  /** The newly linked (Registered) user the conversations move to. */
  toUserId: string;
};

/**
 * Claim a Guest's conversations into a real account: reassign every
 * `conversations.userId` from the anonymous user to the newly linked user.
 *
 * Run from the anonymous plugin's `onLinkAccount` hook BEFORE the anonymous row
 * is cleaned up (ADR-0010 §2). Extracted into its own file so the claim is a
 * real, directly-testable seam independent of the better-auth SDK wiring.
 */
export const claimConversations = async (
  db: DbClient,
  { fromUserId, toUserId }: ClaimConversationsParams,
): Promise<void> => {
  await db
    .update(conversations)
    .set({ userId: toUserId })
    .where(eq(conversations.userId, fromUserId));
};
