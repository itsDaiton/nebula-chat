import { eq, lt, desc, ilike } from 'drizzle-orm';
import { conversations } from '@nebula-chat/db';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@backend/db';
import { paginationConfig } from '@backend/config/pagination.config';
import type {
  CreateConversationDTO,
  GetConversationParams,
} from '@backend/modules/conversation/conversation.types';

export const conversationRepository = {
  async create({ title }: CreateConversationDTO) {
    const [row] = await db.insert(conversations).values({ title }).returning();
    return row!;
  },
  async findById({ conversationId }: GetConversationParams) {
    const [row] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    return row ?? null;
  },
  async findAll(limit = paginationConfig.defaultLimit, cursor?: string) {
    let cursorCreatedAt: Date | undefined;
    if (cursor) {
      const [cursorRow] = await db
        .select({ createdAt: conversations.createdAt })
        .from(conversations)
        .where(eq(conversations.id, cursor));
      cursorCreatedAt = cursorRow?.createdAt;
    }

    const rows = await db
      .select({ id: conversations.id, title: conversations.title, createdAt: conversations.createdAt })
      .from(conversations)
      .where(cursorCreatedAt ? lt(conversations.createdAt, cursorCreatedAt) : undefined)
      .orderBy(desc(conversations.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return { conversations: items, nextCursor, hasMore };
  },
  async findByIdSimple(id: string) {
    const [row] = await db.select().from(conversations).where(eq(conversations.id, id));
    return row ?? null;
  },
  async findByIdTx(tx: DbTransaction, id: string) {
    const [row] = await tx.select().from(conversations).where(eq(conversations.id, id));
    return row ?? null;
  },
  async createTx(tx: DbTransaction, title: string) {
    const [row] = await tx.insert(conversations).values({ title }).returning();
    return row!;
  },
  async search(query: string, limit = paginationConfig.maxLimit) {
    return db
      .select({ id: conversations.id, title: conversations.title, createdAt: conversations.createdAt })
      .from(conversations)
      .where(ilike(conversations.title, `%${query}%`))
      .orderBy(desc(conversations.createdAt))
      .limit(limit);
  },
};
