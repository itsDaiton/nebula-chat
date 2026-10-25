import { and, desc, eq } from 'drizzle-orm';
import { messages, sessions } from '@nebula-chat/db';
import { db } from '@worker/db';
import type { DirectReplyStore } from '@worker/directReplies/runDirectReply';

/** The Postgres `DirectReplyStore`. Owner-scoped like the server's reads (ADR-0010 §2). */
export const directReplyRepository: DirectReplyStore = {
  async findSession(sessionId, userId) {
    const [row] = await db
      .select({ id: sessions.id, model: sessions.model })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
    return row ?? null;
  },
  async findRecentMessages(sessionId, limit) {
    return db
      .select({ id: messages.id, role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  },
  async createAssistantMessage({ id, sessionId, content, tokenCount, cached }) {
    await db
      .insert(messages)
      .values({ id, sessionId, role: 'assistant', content, tokenCount, cached });
  },
};
