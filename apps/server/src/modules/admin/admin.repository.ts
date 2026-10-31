import { and, asc, desc, eq, gt, isNull, ne, or, sql } from 'drizzle-orm';
import { messages, sessions, users } from '@nebula-chat/db';
import { auth } from '@server/auth';
import { db } from '@server/db';
import type { AdminRole, UserFilters } from '@server/modules/admin/admin.types';

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
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

// A correlated subquery, so only the rows of the page are counted unless the list sorts by it.
const messagesSent = sql<number>`(
  select count(*)::int from ${messages}
  inner join ${sessions} on ${sessions.id} = ${messages.sessionId}
  where ${sessions.userId} = ${users.id} and ${messages.role} = 'user'
)`;

const sortKeys = {
  createdAt: users.createdAt,
  lastActiveAt: users.updatedAt,
  messagesSent,
};

const isGuest = sql`coalesce(${users.isAnonymous}, false)`;

const isBanned = () =>
  and(eq(users.banned, true), or(isNull(users.banExpires), gt(users.banExpires, new Date())));

// Mirrors the precedence of `status` in the service, so each User is in exactly one status.
const statusFilters = {
  guest: () => isGuest,
  banned: () => and(sql`not ${isGuest}`, isBanned()),
  admin: () =>
    and(sql`not ${isGuest}`, sql`not coalesce(${isBanned()}, false)`, eq(users.role, 'admin')),
  unverified: () =>
    and(
      sql`not ${isGuest}`,
      sql`not coalesce(${isBanned()}, false)`,
      eq(users.emailVerified, false),
    ),
  registered: () =>
    and(
      sql`not ${isGuest}`,
      sql`not coalesce(${isBanned()}, false)`,
      eq(users.emailVerified, true),
      ne(users.role, 'admin'),
    ),
  // No column yet: nobody is pending deletion until the account lifecycle ticket.
  pendingDeletion: () => sql`false`,
};

const searchFilter = (search: string) => {
  const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  return or(sql`${users.name} ilike ${pattern}`, sql`${users.email} ilike ${pattern}`);
};

export const adminRepository = {
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
      .select({ ...userSummaryColumns, messagesSent })
      .from(users)
      .where(
        and(
          // Guests far outnumber Registered users, so they are listed only when asked for.
          filters.status ? statusFilters[filters.status]() : sql`not ${isGuest}`,
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
        banReason: users.banReason,
        sessionsCount: db.$count(sessions, eq(sessions.userId, users.id)),
      })
      .from(users)
      .where(eq(users.id, id));
    return row ?? null;
  },
};
