import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { modelCalls, runs, sessions, steps, users } from '@nebula-chat/db';
import type { RunStatus } from '@nebula-chat/db';
import { auth } from '@server/auth';
import { db } from '@server/db';
import type {
  AdminRole,
  DayCount,
  OverviewCounts,
  RunFilters,
  SessionFilters,
  UserFilters,
} from '@server/modules/admin/admin.types';

const userColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  emailVerified: users.emailVerified,
  isAnonymous: users.isAnonymous,
  banned: users.banned,
  role: users.role,
  twoFactorEnabled: users.twoFactorEnabled,
  createdAt: users.createdAt,
};

const userSummaryColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  emailVerified: users.emailVerified,
  isAnonymous: users.isAnonymous,
  banned: users.banned,
  banExpires: users.banExpires,
  role: users.role,
  twoFactorEnabled: users.twoFactorEnabled,
  pendingDeletionAt: users.pendingDeletionAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

// Drizzle drops qualifiers in a single-table select, so columns are qualified by hand (a bare `id` is ambiguous).
// Correlated, so only the page's rows are counted unless the list sorts by it.
const messagesSent = sql<number>`(
  select count(*)::int from "messages"
  inner join "sessions" on "sessions"."id" = "messages"."session_id"
  where "sessions"."user_id" = "users"."id" and "messages"."role" = 'user'
)`;

const sessionsCount = sql<number>`(select count(*)::int from "sessions" where "sessions"."user_id" = "users"."id")`;

const sortKeys = {
  createdAt: users.createdAt,
  lastActiveAt: users.updatedAt,
  messagesSent,
};

const adminSessionColumns = {
  id: sessions.id,
  userId: sessions.userId,
  title: sessions.title,
  model: sessions.model,
  archived: sql<boolean>`${sessions.archivedAt} is not null`,
  messageCount: sql<number>`(select count(*)::int from "messages" where "messages"."session_id" = "sessions"."id")`,
  createdAt: sessions.createdAt,
  updatedAt: sessions.updatedAt,
};

const sessionSearchFilter = (search: string) => {
  const escaped = search.replace(/[\\%_]/g, String.raw`\$&`);
  const pattern = `%${escaped}%`;
  return sql`${sessions.title} ilike ${pattern}`;
};

// Steps and Model calls are summed in their own derived tables before the join, so neither multiplies the other.
// A Run's sort value is never null (a missing duration or cost is -1), so the cursor row compare stays total.
const runRows = (name: string, sortBy: RunFilters['sortBy']) => {
  const stepCounts = db
    .select({ runId: steps.runId, stepCount: sql<number>`count(*)::int`.as('steps_total') })
    .from(steps)
    .groupBy(steps.runId)
    .as(`${name}_step_counts`);
  const costs = db
    .select({
      runId: modelCalls.runId,
      costUsd: sql<
        number | null
      >`(sum(${modelCalls.costUsd}) filter (where not ${modelCalls.ownKey}))::float8`.as(
        'calls_cost',
      ),
    })
    .from(modelCalls)
    .where(isNotNull(modelCalls.runId))
    .groupBy(modelCalls.runId)
    .as(`${name}_costs`);
  const startedAt = sql`coalesce(${runs.startedAt}, ${runs.createdAt})`;
  const sortValues = {
    startedAt,
    duration: sql`coalesce(extract(epoch from (${runs.finishedAt} - ${startedAt})) * 1000, -1)`,
    tokens: sql`${runs.tokensUsed}`,
    cost: sql`coalesce(${costs.costUsd}, -1)`,
  };
  return db
    .select({
      id: sql<string>`${runs.id}`.as('id'),
      status: sql<RunStatus>`${runs.status}`.as('status'),
      userId: sql<string>`${runs.userId}`.as('user_id'),
      startedAt: sql<Date>`${startedAt}`.mapWith(runs.createdAt).as('started_at'),
      finishedAt: sql<Date | null>`${runs.finishedAt}`.mapWith(runs.finishedAt).as('finished_at'),
      stepCount: sql<number>`coalesce(${stepCounts.stepCount}, 0)`.as('step_count'),
      tokensUsed: sql<number>`${runs.tokensUsed}`.as('tokens_used'),
      tokenBudget: sql<number | null>`${runs.tokenBudget}`.as('token_budget'),
      costUsd: sql<number | null>`${costs.costUsd}`.as('cost_usd'),
      ownerName: sql<string>`${users.name}`.as('owner_name'),
      sessionId: sql<string>`${sessions.id}`.as('session_id'),
      sessionTitle: sql<string>`${sessions.title}`.as('session_title'),
      sortValue: sql`${sortValues[sortBy]}`.as('sort_value'),
    })
    .from(runs)
    .innerJoin(users, eq(users.id, runs.userId))
    .innerJoin(sessions, eq(sessions.id, runs.sessionId))
    .leftJoin(stepCounts, eq(stepCounts.runId, runs.id))
    .leftJoin(costs, eq(costs.runId, runs.id))
    .as(name);
};

const isGuest = sql`coalesce(${users.isAnonymous}, false)`;

const isBanned = () =>
  and(eq(users.banned, true), or(isNull(users.banExpires), gt(users.banExpires, new Date())));

const notPending = isNull(users.pendingDeletionAt);

const bannedFilter = (banned: boolean | undefined) => {
  if (banned === undefined) return undefined;
  return banned ? isBanned() : sql`not coalesce(${isBanned()}, false)`;
};

// Mirrors the precedence of `status` in the service, so each User is in exactly one status.
const statusFilters = {
  guest: () => isGuest,
  pendingDeletion: () => and(sql`not ${isGuest}`, isNotNull(users.pendingDeletionAt)),
  banned: () => and(sql`not ${isGuest}`, notPending, isBanned()),
  admin: () =>
    and(
      sql`not ${isGuest}`,
      notPending,
      sql`not coalesce(${isBanned()}, false)`,
      eq(users.role, 'admin'),
    ),
  unverified: () =>
    and(
      sql`not ${isGuest}`,
      notPending,
      sql`not coalesce(${isBanned()}, false)`,
      eq(users.emailVerified, false),
    ),
  registered: () =>
    and(
      sql`not ${isGuest}`,
      notPending,
      sql`not coalesce(${isBanned()}, false)`,
      eq(users.emailVerified, true),
      ne(users.role, 'admin'),
    ),
};

const searchFilter = (search: string) => {
  const escaped = search.replace(/[\\%_]/g, String.raw`\$&`);
  const pattern = `%${escaped}%`;
  return or(sql`${users.name} ilike ${pattern}`, sql`${users.email} ilike ${pattern}`);
};

// Days are UTC `YYYY-MM-DD`, both ends inclusive; the timestamp columns hold UTC.
const countsByDay = async (query: ReturnType<typeof sql>): Promise<DayCount[]> => {
  const { rows } = await db.execute<DayCount>(query);
  return rows;
};

export const adminRepository = {
  async overviewCounts(from: string, to: string): Promise<OverviewCounts> {
    const [dailyActive, weeklyActive, registrations, conversions, guests, messages, spend] =
      await Promise.all([
        countsByDay(sql`
          select to_char(m.created_at, 'YYYY-MM-DD') as day, count(distinct s.user_id)::int as count
          from messages m join sessions s on s.id = m.session_id
          where m.role = 'user' and m.created_at >= ${from}::timestamp and m.created_at < (${to}::date + 1)::timestamp
          group by 1`),
        countsByDay(sql`
          select to_char(d, 'YYYY-MM-DD') as day, count(distinct s.user_id)::int as count
          from generate_series(${from}::timestamp, ${to}::timestamp, interval '1 day') as d
          left join messages m on m.role = 'user'
            and m.created_at >= d - interval '6 days' and m.created_at < d + interval '1 day'
          left join sessions s on s.id = m.session_id
          group by d`),
        countsByDay(sql`
          select to_char(created_at, 'YYYY-MM-DD') as day, count(*)::int as count
          from users
          where not coalesce(is_anonymous, false) and created_at >= ${from}::timestamp and created_at < (${to}::date + 1)::timestamp
          group by 1`),
        // A Claim leaves no timestamp, so a conversion is a Registered account whose Sessions predate it, counted on the account's creation day.
        countsByDay(sql`
          select to_char(u.created_at, 'YYYY-MM-DD') as day, count(*)::int as count
          from users u
          where not coalesce(u.is_anonymous, false)
            and u.created_at >= ${from}::timestamp and u.created_at < (${to}::date + 1)::timestamp
            and exists (select 1 from sessions s where s.user_id = u.id and s.created_at < u.created_at)
          group by 1`),
        countsByDay(sql`
          select to_char(created_at, 'YYYY-MM-DD') as day, count(*)::int as count
          from users
          where coalesce(is_anonymous, false) and created_at >= ${from}::timestamp and created_at < (${to}::date + 1)::timestamp
          group by 1`),
        countsByDay(sql`
          select to_char(created_at, 'YYYY-MM-DD') as day, count(*)::int as count
          from messages
          where role = 'user' and created_at >= ${from}::timestamp and created_at < (${to}::date + 1)::timestamp
          group by 1`),
        // `count` carries estimated USD here, summed from the Model call ledger.
        countsByDay(sql`
          select to_char(created_at, 'YYYY-MM-DD') as day, (sum(cost_usd) filter (where not own_key))::float8 as count
          from model_calls
          where created_at >= ${from}::timestamp and created_at < (${to}::date + 1)::timestamp
          group by 1`),
      ]);
    return { dailyActive, weeklyActive, registrations, conversions, guests, messages, spend };
  },
  async findUserByEmail(email: string) {
    const [row] = await db.select(userColumns).from(users).where(eq(users.email, email));
    return row ?? null;
  },
  listAdmins() {
    return db
      .select(userColumns)
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(asc(users.createdAt))
      .limit(100);
  },
  // The write `auth.api.setRole` makes, which also refreshes the user cached in their auth sessions;
  // the endpoint itself needs an Admin's session, which an Operator does not have.
  async setRole(userId: string, role: AdminRole) {
    const { internalAdapter } = await auth.$context;
    await internalAdapter.updateUser(userId, { role });
  },
  async listUsers(filters: UserFilters, limit: number, cursor?: string) {
    const sortKey = sortKeys[filters.sortBy];
    const after = filters.order === 'asc' ? sql.raw('>') : sql.raw('<');
    // Compared in SQL against the cursor row, so no timestamp is rounded to milliseconds on the way through JS.
    const cursorFilter = cursor
      ? sql`(${sortKey}, ${users.id}) ${after} (select ${sortKey}, ${users.id} from ${users} where ${users.id} = ${cursor})`
      : undefined;

    const direction = filters.order === 'asc' ? asc : desc;
    const rows = await db
      .select({ ...userSummaryColumns, messagesSent, sessionsCount })
      .from(users)
      .where(
        and(
          // Guests far outnumber Registered users, so they are listed only when asked for.
          filters.status
            ? or(...filters.status.map((status) => statusFilters[status]()))
            : sql`not ${isGuest}`,
          filters.role ? eq(users.role, filters.role) : undefined,
          bannedFilter(filters.banned),
          filters.search ? searchFilter(filters.search) : undefined,
          cursorFilter,
        ),
      )
      .orderBy(direction(sortKey), direction(users.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, -1) : rows;
    const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

    return { users: page, nextCursor, hasMore };
  },
  async findUserDetail(id: string) {
    const [row] = await db
      .select({
        ...userSummaryColumns,
        messagesSent,
        sessionsCount,
        banReason: users.banReason,
        banNote: users.banNote,
      })
      .from(users)
      .where(eq(users.id, id));
    return row ?? null;
  },
  async setBanNote(id: string, banNote: string | null) {
    await db.update(users).set({ banNote }).where(eq(users.id, id));
  },
  async findModerationTarget(id: string) {
    const [row] = await db
      .select({
        id: users.id,
        emailVerified: users.emailVerified,
        isAnonymous: users.isAnonymous,
        banned: users.banned,
        banExpires: users.banExpires,
        banReason: users.banReason,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, id));
    return row ?? null;
  },
  async countOtherActiveAdmins(id: string) {
    return db.$count(
      users,
      and(eq(users.role, 'admin'), ne(users.id, id), sql`not coalesce(${isBanned()}, false)`),
    );
  },
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
  // Admin reads are not owner-scoped; archived Sessions are included and marked.
  async findSession(id: string) {
    const [row] = await db.select(adminSessionColumns).from(sessions).where(eq(sessions.id, id));
    return row ?? null;
  },
  async listUserSessions(userId: string, limit: number, cursor?: string) {
    let cursorFilter;
    if (cursor) {
      const [cursorRow] = await db
        .select({ createdAt: sessions.createdAt, id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.id, cursor), eq(sessions.userId, userId)));
      cursorFilter = cursorRow
        ? or(
            lt(sessions.createdAt, cursorRow.createdAt),
            and(eq(sessions.createdAt, cursorRow.createdAt), lt(sessions.id, cursorRow.id)),
          )
        : undefined;
    }

    const rows = await db
      .select(adminSessionColumns)
      .from(sessions)
      .where(and(eq(sessions.userId, userId), cursorFilter))
      .orderBy(desc(sessions.createdAt), desc(sessions.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, -1) : rows;
    const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

    return { sessions: page, nextCursor, hasMore };
  },
  // Listing is not a content read, so it is not audited; archived Sessions are included unless filtered out.
  async listSessions(filters: SessionFilters, limit: number, cursor?: string) {
    const after = filters.order === 'asc' ? sql.raw('>') : sql.raw('<');
    // Compared in SQL against the cursor row, so no timestamp is rounded to milliseconds on the way through JS.
    const cursorFilter = cursor
      ? sql`(${sessions.updatedAt}, ${sessions.id}) ${after} (select ${sessions.updatedAt}, ${sessions.id} from ${sessions} where ${sessions.id} = ${cursor})`
      : undefined;
    let archivedFilter;
    if (filters.archived !== undefined) {
      archivedFilter = filters.archived
        ? isNotNull(sessions.archivedAt)
        : isNull(sessions.archivedAt);
    }

    const direction = filters.order === 'asc' ? asc : desc;
    const rows = await db
      .select({
        ...adminSessionColumns,
        owner: { id: users.id, name: users.name },
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          filters.search ? sessionSearchFilter(filters.search) : undefined,
          filters.userId ? eq(sessions.userId, filters.userId) : undefined,
          filters.model ? eq(sessions.model, filters.model) : undefined,
          archivedFilter,
          cursorFilter,
        ),
      )
      .orderBy(direction(sessions.updatedAt), direction(sessions.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, -1) : rows;
    const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

    return { sessions: page, nextCursor, hasMore };
  },
  // Listing is not a content read, so it is not audited; the owner's email is never selected.
  async listRuns(filters: RunFilters, limit: number, cursor?: string) {
    const base = runRows('runs_base', filters.sortBy);
    const after = filters.order === 'asc' ? sql.raw('>') : sql.raw('<');
    let cursorFilter;
    if (cursor) {
      const cursorBase = runRows('runs_cursor', filters.sortBy);
      cursorFilter = sql`(${base.sortValue}, ${base.id}) ${after} (select ${cursorBase.sortValue}, ${cursorBase.id} from ${cursorBase} where ${cursorBase.id} = ${cursor})`;
    }

    const direction = filters.order === 'asc' ? asc : desc;
    const rows = await db
      .select()
      .from(base)
      .where(
        and(
          filters.status ? inArray(base.status, filters.status) : undefined,
          filters.userId ? eq(base.userId, filters.userId) : undefined,
          filters.from ? gte(base.startedAt, filters.from) : undefined,
          filters.to ? lt(base.startedAt, filters.to) : undefined,
          cursorFilter,
        ),
      )
      .orderBy(direction(base.sortValue), direction(base.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = (hasMore ? rows.slice(0, -1) : rows).map((row) => ({
      id: row.id,
      status: row.status,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      stepCount: row.stepCount,
      tokensUsed: row.tokensUsed,
      tokenBudget: row.tokenBudget,
      costUsd: row.costUsd,
      owner: { id: row.userId, name: row.ownerName },
      session: { id: row.sessionId, title: row.sessionTitle },
    }));
    const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

    return { runs: page, nextCursor, hasMore };
  },
};
