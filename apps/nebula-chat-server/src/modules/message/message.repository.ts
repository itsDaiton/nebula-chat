import { eq, desc } from 'drizzle-orm';
import { messages } from '@nebula-chat/db';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@backend/db';
import type { CreateMessageDTO, GetMessageParams } from '@backend/modules/message/message.types';

export const messageRepository = {
  async create({ conversationId, content, role, tokenCount }: CreateMessageDTO) {
    const [row] = await db
      .insert(messages)
      .values({ conversationId, content, role, tokenCount: tokenCount ?? null })
      .returning();
    return row!;
  },
  async findById({ messageId }: GetMessageParams) {
    const [row] = await db.select().from(messages).where(eq(messages.id, messageId));
    return row ?? null;
  },
  findAll() {
    return db.select().from(messages).orderBy(desc(messages.createdAt));
  },
  async createTx(tx: DbTransaction, data: CreateMessageDTO) {
    const { conversationId, content, role, tokenCount } = data;
    const [row] = await tx
      .insert(messages)
      .values({ conversationId, content, role, tokenCount: tokenCount ?? null })
      .returning();
    return row!;
  },
  findByConversationId(conversationId: string, limit?: number) {
    const base = db
      .select({ role: messages.role, content: messages.content, tokenCount: messages.tokenCount })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt));
    return limit !== undefined ? base.limit(limit) : base;
  },
};
