import { beforeEach, describe, expect, it } from 'vitest';
import { captureLogger, eventLines, LEVEL } from '@nebula-chat/otel/testing';
import { createPurgeProcessor } from '@worker/jobs/purge';
import type { PurgeCounts, PurgeCutoffs, PurgeStore } from '@worker/purge/runPurge';

const NOW = new Date('2026-11-30T03:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

type StoredUser = {
  id: string;
  isAnonymous: boolean;
  createdAt: Date;
  pendingDeletionAt?: Date;
  lastActiveAt?: Date;
};

/** Postgres in memory: deleting a User clears the User on their Model calls. */
const memoryPurgeStore = () => {
  const users = new Map<string, StoredUser>();
  const audit: PurgeCounts[] = [];
  const modelCalls: { userId: string | null }[] = [];
  const failing = new Set<string>();

  const pendingExpired = (u: StoredUser, c: PurgeCutoffs) =>
    u.pendingDeletionAt !== undefined && u.pendingDeletionAt < c.pendingDeletionBefore;
  const guestInactive = (u: StoredUser, c: PurgeCutoffs) =>
    u.isAnonymous &&
    u.pendingDeletionAt === undefined &&
    (u.lastActiveAt ?? u.createdAt) < c.guestInactiveBefore;

  const store: PurgeStore = {
    findDue: async (c) => ({
      pendingUserIds: [...users.values()].filter((u) => pendingExpired(u, c)).map((u) => u.id),
      guestIds: [...users.values()].filter((u) => guestInactive(u, c)).map((u) => u.id),
    }),
    purgeUser: async (id, c) => {
      const user = users.get(id);
      if (!user || !(pendingExpired(user, c) || guestInactive(user, c))) return false;
      if (failing.has(id)) throw new Error('connection reset');
      for (const call of modelCalls) if (call.userId === id) call.userId = null;
      users.delete(id);
      return true;
    },
    appendAudit: async (counts) => {
      audit.push(counts);
    },
  };

  const add = (id: string, overrides: Partial<StoredUser> = {}) => {
    users.set(id, {
      id,
      isAnonymous: false,
      createdAt: daysAgo(90),
      ...overrides,
    });
    modelCalls.push({ userId: id });
  };
  return { store, users, audit, modelCalls, failing, add };
};

let db: ReturnType<typeof memoryPurgeStore>;
let log: ReturnType<typeof captureLogger>;

const run = () =>
  createPurgeProcessor({
    store: db.store,
    logger: log.logger,
    now: () => NOW,
    pendingDeletionDays: 30,
    guestInactiveDays: 30,
  })({ id: 'job-1', data: {} });

beforeEach(() => {
  db = memoryPurgeStore();
  log = captureLogger();
});

describe('Purge job', () => {
  it('erases a User whose Pending deletion started over 30 days ago, and keeps one still inside the window', async () => {
    db.add('expired', { pendingDeletionAt: daysAgo(31) });
    db.add('inside-window', { pendingDeletionAt: daysAgo(29) });
    db.add('not-deleting');

    await run();

    expect([...db.users.keys()].toSorted()).toEqual(['inside-window', 'not-deleting']);
  });

  it('erases a Guest idle for over 30 days by lastActiveAt, or by createdAt when never active', async () => {
    db.add('idle-guest', { isAnonymous: true, lastActiveAt: daysAgo(31) });
    db.add('never-active-guest', { isAnonymous: true, createdAt: daysAgo(31) });
    db.add('active-guest', { isAnonymous: true, createdAt: daysAgo(90), lastActiveAt: daysAgo(2) });
    db.add('new-guest', { isAnonymous: true, createdAt: daysAgo(1) });
    db.add('old-registered', { createdAt: daysAgo(400) });

    await run();

    expect([...db.users.keys()].toSorted()).toEqual([
      'active-guest',
      'new-guest',
      'old-registered',
    ]);
  });

  it('keeps the Model calls of a Purged User with the User reference cleared', async () => {
    db.add('expired', { pendingDeletionAt: daysAgo(40) });
    db.add('kept');

    await run();

    expect(db.modelCalls).toEqual([{ userId: null }, { userId: 'kept' }]);
  });

  it('writes one system Audit entry with the counts, and no ids', async () => {
    db.add('expired-1', { pendingDeletionAt: daysAgo(40) });
    db.add('expired-2', { pendingDeletionAt: daysAgo(35) });
    db.add('idle-guest', { isAnonymous: true, createdAt: daysAgo(60) });

    await run();

    expect(db.audit).toEqual([{ pendingUsers: 2, guests: 1, failed: 0 }]);
    const [done] = eventLines(log.lines, 'account.purge.completed');
    expect(done).toMatchObject({
      level: LEVEL.info,
      'nebula.purge.pending_users': 2,
      'nebula.purge.guests': 1,
      'nebula.purge.failed': 0,
    });
    expect(JSON.stringify(log.lines)).not.toContain('expired-1');
  });

  it('is a no-op the second time: nothing left to erase and no Audit entry', async () => {
    db.add('expired', { pendingDeletionAt: daysAgo(40) });
    await run();
    db.audit.length = 0;

    await run();

    expect(db.audit).toEqual([]);
    expect(db.users.size).toBe(0);
  });

  it('skips a User restored since the scan', async () => {
    db.add('restored', { pendingDeletionAt: daysAgo(40) });
    const findDue = db.store.findDue;
    db.store.findDue = async (c) => {
      const due = await findDue(c);
      delete db.users.get('restored')!.pendingDeletionAt;
      return due;
    };

    await run();

    expect(db.users.has('restored')).toBe(true);
    expect(db.audit).toEqual([]);
  });

  it('erases the rest when one User fails, then throws so BullMQ retries and the retry finishes', async () => {
    db.add('stuck', { pendingDeletionAt: daysAgo(40) });
    db.add('fine', { pendingDeletionAt: daysAgo(40) });
    db.failing.add('stuck');

    await expect(run()).rejects.toThrow('Purge left 1 User(s) behind');

    expect([...db.users.keys()]).toEqual(['stuck']);
    expect(db.audit).toEqual([{ pendingUsers: 1, guests: 0, failed: 1 }]);
    expect(eventLines(log.lines, 'account.purge.user.failed')).toHaveLength(1);

    db.failing.clear();
    await run();

    expect(db.users.size).toBe(0);
  });

  it('drops a payload that breaks the contract without purging', async () => {
    db.add('expired', { pendingDeletionAt: daysAgo(40) });

    await createPurgeProcessor({
      store: db.store,
      logger: log.logger,
      now: () => NOW,
      pendingDeletionDays: 30,
      guestInactiveDays: 30,
    })({ id: 'job-2', data: 'nope' });

    expect(db.users.size).toBe(1);
    expect(eventLines(log.lines, 'job.payload.rejected')).toHaveLength(1);
  });
});
