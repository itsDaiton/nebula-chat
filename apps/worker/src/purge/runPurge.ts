import { logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A User is due when their Pending deletion started, or a Guest was last active, before these. */
export type PurgeCutoffs = { pendingDeletionBefore: Date; guestInactiveBefore: Date };

export type PurgeCandidates = { pendingUserIds: string[]; guestIds: string[] };

/** What a run erased and what it could not; counts only, never ids or content (ADR-0028). */
export type PurgeCounts = { pendingUsers: number; guests: number; failed: number };

export type PurgeStore = {
  findDue: (cutoffs: PurgeCutoffs) => Promise<PurgeCandidates>;
  // One transaction per User; false when the User is no longer due (restored, active again, already gone).
  purgeUser: (userId: string, cutoffs: PurgeCutoffs) => Promise<boolean>;
  appendAudit: (counts: PurgeCounts) => Promise<void>;
};

export type PurgeDeps = {
  store: PurgeStore;
  logger: Logger;
  now: () => Date;
  pendingDeletionDays: number;
  guestInactiveDays: number;
};

// Rerunning is safe: a Purged User is gone, so an interrupted run's retry finds only what is left.
export const runPurge = async (deps: PurgeDeps): Promise<PurgeCounts> => {
  const now = deps.now().getTime();
  const cutoffs: PurgeCutoffs = {
    pendingDeletionBefore: new Date(now - deps.pendingDeletionDays * DAY_MS),
    guestInactiveBefore: new Date(now - deps.guestInactiveDays * DAY_MS),
  };
  const due = await deps.store.findDue(cutoffs);
  const counts: PurgeCounts = { pendingUsers: 0, guests: 0, failed: 0 };

  const purge = async (ids: string[], purged: 'pendingUsers' | 'guests') => {
    for (const userId of ids) {
      try {
        if (await deps.store.purgeUser(userId, cutoffs)) counts[purged]++;
      } catch (err) {
        counts.failed++;
        logEvent(
          deps.logger,
          'warn',
          'account.purge.user.failed',
          { 'user.id': userId, err },
          'Purge of a User failed; the retry picks it up',
        );
      }
    }
  };
  await purge(due.pendingUserIds, 'pendingUsers');
  await purge(due.guestIds, 'guests');

  if (counts.pendingUsers + counts.guests > 0) await deps.store.appendAudit(counts);
  logEvent(
    deps.logger,
    'info',
    'account.purge.completed',
    {
      'nebula.purge.pending_users': counts.pendingUsers,
      'nebula.purge.guests': counts.guests,
      'nebula.purge.failed': counts.failed,
    },
    'Purge finished',
  );
  return counts;
};
