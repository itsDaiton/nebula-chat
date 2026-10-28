import { eq, lt, desc, ilike, and, or, exists, isNull, isNotNull, sql } from 'drizzle-orm';
import { messages, sessions } from '@nebula-chat/db';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@server/db';
import { paginationConfig } from '@server/config/pagination.config';
import type { CreateSessionDTO, GetSessionParams } from '@server/modules/session/session.types';

// The DTO fields; `archived` stands in for the `archivedAt` timestamp, which stays server-side.
const sessionColumns = {
  id: sessions.id,
  title: sessions.title,
  createdAt: sessions.createdAt,
  archived: sql<boolean>`${sessions.archivedAt} is not null`,
};

// The default list and search leave archived Sessions out; `?archived=true` shows only those.
const archivedFilter = (archived: boolean) =>
  archived ? isNotNull(sessions.archivedAt) : isNull(sessions.archivedAt);

export const sessionRepository = {
  async create({ title }: CreateSessionDTO, userId: string) {
    const [row] = await db.insert(sessions).values({ title, userId }).returning(sessionColumns);
    return row!;
  },
  // Every read is owner-scoped (ADR-0010 §2): another user's session reads as absent (a 404, never a 403 that leaks it).
  async findById({ sessionId }: GetSessionParams, userId: string) {
    const [row] = await db
      .select(sessionColumns)
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
    return row ?? null;
  },
  async findAll(
    userId: string,
    limit = paginationConfig.defaultLimit,
    cursor?: string,
    archived = false,
  ) {
    let cursorCreatedAt: Date | undefined;
    let cursorId: string | undefined;
    if (cursor) {
      const [cursorRow] = await db
        .select({ createdAt: sessions.createdAt, id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.id, cursor), eq(sessions.userId, userId)));
      cursorCreatedAt = cursorRow?.createdAt;
      cursorId = cursorRow?.id;
    }

    const cursorFilter =
      cursorCreatedAt && cursorId
        ? or(
            lt(sessions.createdAt, cursorCreatedAt),
            and(eq(sessions.createdAt, cursorCreatedAt), lt(sessions.id, cursorId)),
          )
        : undefined;

    const rows = await db
      .select(sessionColumns)
      .from(sessions)
      .where(and(eq(sessions.userId, userId), archivedFilter(archived), cursorFilter))
      .orderBy(desc(sessions.createdAt), desc(sessions.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;

    return { sessions: items, nextCursor, hasMore };
  },
  async findByIdSimple(id: string, userId: string) {
    const [row] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
    return row ?? null;
  },
  async findByIdTx(tx: DbTransaction, id: string, userId: string) {
    const [row] = await tx
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
    return row ?? null;
  },
  async updateModelTx(tx: DbTransaction, id: string, model: string) {
    await tx.update(sessions).set({ model, updatedAt: new Date() }).where(eq(sessions.id, id));
  },
  // Matches a Session's title or any of its Messages; `matchedContent` is the earliest matching Message's content, if any.
  async search(userId: string, query: string, archived = false, limit = paginationConfig.maxLimit) {
    const pattern = `%${query}%`;
    const messageMatch = and(eq(messages.sessionId, sessions.id), ilike(messages.content, pattern));
    return db
      .select({
        ...sessionColumns,
        matchedContent: sql<
          string | null
        >`(select ${messages.content} from ${messages} where ${messageMatch} order by ${messages.createdAt}, ${messages.id} limit 1)`,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          archivedFilter(archived),
          or(
            ilike(sessions.title, pattern),
            exists(
              db
                .select({ one: sql`1` })
                .from(messages)
                .where(messageMatch),
            ),
          ),
        ),
      )
      .orderBy(desc(sessions.createdAt))
      .limit(limit);
  },
  // Idempotent: an already-archived Session keeps its original `archivedAt`.
  async archive(id: string, userId: string) {
    const [row] = await db
      .update(sessions)
      .set({ archivedAt: sql`coalesce(${sessions.archivedAt}, now())` })
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
      .returning(sessionColumns);
    return row ?? null;
  },
  async restore(id: string, userId: string) {
    const [row] = await db
      .update(sessions)
      .set({ archivedAt: null })
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
      .returning(sessionColumns);
    return row ?? null;
  },
};
