import { eq, lt, desc, ilike, and, or } from 'drizzle-orm';
import { conversations } from '@nebula-chat/db';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@backend/db';
import { paginationConfig } from '@backend/config/pagination.config';
import type {
  CreateConversationDTO,
  GetConversationParams,
} from '@backend/modules/conversation/conversation.types';

export const conversationRepository = {
  async create({ title }: CreateConversationDTO, userId: string) {
    const [row] = await db.insert(conversations).values({ title, userId }).returning();
    return row!;
  },
  // Every read is owner-scoped (ADR-0010 §2): a caller only ever sees conversations
  // they own, so a row belonging to another user reads as absent (a 404, never a 403
  // that would leak its existence).
  async findById({ conversationId }: GetConversationParams, userId: string) {
    const [row] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
    return row ?? null;
  },
  async findAll(userId: string, limit = paginationConfig.defaultLimit, cursor?: string) {
    let cursorCreatedAt: Date | undefined;
    let cursorId: string | undefined;
    if (cursor) {
      const [cursorRow] = await db
        .select({ createdAt: conversations.createdAt, id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, cursor), eq(conversations.userId, userId)));
      cursorCreatedAt = cursorRow?.createdAt;
      cursorId = cursorRow?.id;
    }

    const cursorFilter =
      cursorCreatedAt && cursorId
        ? or(
            lt(conversations.createdAt, cursorCreatedAt),
            and(eq(conversations.createdAt, cursorCreatedAt), lt(conversations.id, cursorId)),
          )
        : undefined;

    const rows = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(and(eq(conversations.userId, userId), cursorFilter))
      .orderBy(desc(conversations.createdAt), desc(conversations.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;

    return { conversations: items, nextCursor, hasMore };
  },
  async findByIdSimple(id: string, userId: string) {
    const [row] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return row ?? null;
  },
  async findByIdTx(tx: DbTransaction, id: string, userId: string) {
    const [row] = await tx
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return row ?? null;
  },
  async createTx(tx: DbTransaction, title: string, userId: string) {
    const [row] = await tx.insert(conversations).values({ title, userId }).returning();
    return row!;
  },
  async search(userId: string, query: string, limit = paginationConfig.maxLimit) {
    return db
      .select({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(and(eq(conversations.userId, userId), ilike(conversations.title, `%${query}%`)))
      .orderBy(desc(conversations.createdAt))
      .limit(limit);
  },
};
