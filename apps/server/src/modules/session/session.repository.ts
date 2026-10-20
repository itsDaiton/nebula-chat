import { eq, lt, desc, ilike, and, or } from 'drizzle-orm';
import { sessions } from '@nebula-chat/db';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@backend/db';
import { paginationConfig } from '@backend/config/pagination.config';
import type { CreateSessionDTO, GetSessionParams } from '@backend/modules/session/session.types';

export const sessionRepository = {
  async create({ title }: CreateSessionDTO, userId: string) {
    const [row] = await db.insert(sessions).values({ title, userId }).returning();
    return row!;
  },
  // Every read is owner-scoped (ADR-0010 §2): a caller only ever sees sessions
  // they own, so a row belonging to another user reads as absent (a 404, never a 403
  // that would leak its existence).
  async findById({ sessionId }: GetSessionParams, userId: string) {
    const [row] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
    return row ?? null;
  },
  async findAll(userId: string, limit = paginationConfig.defaultLimit, cursor?: string) {
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
      .select({
        id: sessions.id,
        title: sessions.title,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), cursorFilter))
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
  async search(userId: string, query: string, limit = paginationConfig.maxLimit) {
    return db
      .select({
        id: sessions.id,
        title: sessions.title,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), ilike(sessions.title, `%${query}%`)))
      .orderBy(desc(sessions.createdAt))
      .limit(limit);
  },
};
