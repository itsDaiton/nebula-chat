import { eq } from 'drizzle-orm';
import { users } from '@nebula-chat/db';
import type { DbClient } from '@nebula-chat/db';

const DAY_MS = 24 * 60 * 60 * 1000;

const PENDING_DELETION_DAYS = 30;

/** How long a restore token stays valid after a sign-in that found a Pending deletion. */
export const RESTORE_TOKEN_TTL_SECONDS = 10 * 60;

/** Sign-in refused because the User is in Pending deletion; the body carries the Purge date and restore token. */
export const PENDING_DELETION_CODE = 'ACCOUNT_PENDING_DELETION';

/** Sign-up refused because the email belongs to a User in Pending deletion. */
export const PENDING_DELETION_SIGN_UP_CODE = 'EMAIL_PENDING_DELETION';

export const PENDING_DELETION_MESSAGES = {
  [PENDING_DELETION_CODE]: 'This account is scheduled for deletion. Restore it to keep your data.',
  [PENDING_DELETION_SIGN_UP_CODE]:
    'An account with this email is scheduled for deletion. Sign in to restore it.',
} as const;

export const restoreTokenIdentifier = (token: string) => `restore-account:${token}`;

export const purgeDateOf = (pendingDeletionAt: Date): Date =>
  new Date(pendingDeletionAt.getTime() + PENDING_DELETION_DAYS * DAY_MS);

/** Whether a session created at `createdAt` still counts as a recent sign-in; a `freshAge` of 0 disables the check. */
export const isSessionFresh = (createdAt: Date, freshAgeSeconds: number, now: Date): boolean =>
  freshAgeSeconds === 0 || now.getTime() - createdAt.getTime() < freshAgeSeconds * 1000;

export const markPendingDeletion = async (db: DbClient, userId: string, now: Date) => {
  await db.update(users).set({ pendingDeletionAt: now }).where(eq(users.id, userId));
};

export const clearPendingDeletion = async (db: DbClient, userId: string) => {
  await db.update(users).set({ pendingDeletionAt: null }).where(eq(users.id, userId));
};

export const findPendingDeletionAt = async (db: DbClient, userId: string) => {
  const [row] = await db
    .select({ pendingDeletionAt: users.pendingDeletionAt })
    .from(users)
    .where(eq(users.id, userId));
  return row?.pendingDeletionAt ?? null;
};

export const findPendingDeletionAtByEmail = async (db: DbClient, email: string) => {
  const [row] = await db
    .select({ pendingDeletionAt: users.pendingDeletionAt })
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  return row?.pendingDeletionAt ?? null;
};
