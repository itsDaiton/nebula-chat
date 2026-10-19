import { eq, asc, desc, and, count } from 'drizzle-orm';
import { messages, sessions } from '@nebula-chat/db';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@backend/db';
import type {
  CreateMessageDTO,
  GetMessageParams,
  MessageHistoryRow,
  MessageRow,
} from '@backend/modules/message/message.types';

export const messageRepository: {
  create: (data: CreateMessageDTO) => Promise<MessageRow>;
  findById: (params: GetMessageParams, userId: string) => Promise<MessageRow | null>;
  findAll: (userId: string, sessionId?: string) => Promise<MessageRow[]>;
  createTx: (tx: DbTransaction, data: CreateMessageDTO) => Promise<MessageRow>;
  findBySessionId: (sessionId: string, limit?: number) => Promise<MessageHistoryRow[]>;
  countUserMessagesByOwner: (userId: string) => Promise<number>;
} = {
  async create({ sessionId, content, role, tokenCount }: CreateMessageDTO) {
    const [row] = await db
      .insert(messages)
      .values({ sessionId, content, role, tokenCount: tokenCount ?? null })
      .returning();
    return row!;
  },
  // Reads are owner-scoped through the message's session (ADR-0010 §2): a
  // message in another user's session reads as absent, joining messages to
  // `sessions.userId` the same way the allowance count does.
  async findById({ messageId }: GetMessageParams, userId: string) {
    const [row] = await db
      .select()
      .from(messages)
      .innerJoin(sessions, eq(messages.sessionId, sessions.id))
      .where(and(eq(messages.id, messageId), eq(sessions.userId, userId)));
    return row?.messages ?? null;
  },
  // Narrowing to one session stays inside the owner join, so another user's
  // session reads as empty rather than leaking its existence. One session
  // reads oldest first; the full list stays newest first.
  async findAll(userId: string, sessionId?: string) {
    const rows = await db
      .select()
      .from(messages)
      .innerJoin(sessions, eq(messages.sessionId, sessions.id))
      .where(
        and(
          eq(sessions.userId, userId),
          sessionId === undefined ? undefined : eq(messages.sessionId, sessionId),
        ),
      )
      .orderBy(sessionId === undefined ? desc(messages.createdAt) : asc(messages.createdAt));
    return rows.map((row) => row.messages);
  },
  async createTx(tx: DbTransaction, data: CreateMessageDTO) {
    const { sessionId, content, role, tokenCount } = data;
    const [row] = await tx
      .insert(messages)
      .values({ sessionId, content, role, tokenCount: tokenCount ?? null })
      .returning();
    return row!;
  },
  async findBySessionId(sessionId: string, limit?: number) {
    const base = db
      .select({
        id: messages.id,
        createdAt: messages.createdAt,
        role: messages.role,
        content: messages.content,
        tokenCount: messages.tokenCount,
      })
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt));
    return limit === undefined ? base : base.limit(limit);
  },
  async countUserMessagesByOwner(userId: string) {
    // The Guest message allowance (ADR-0010 §4): count the owner's `user`-authored
    // messages live from Postgres by joining messages to their sessions.
    // Assistant messages and other owners' rows never contribute.
    const [row] = await db
      .select({ value: count() })
      .from(messages)
      .innerJoin(sessions, eq(messages.sessionId, sessions.id))
      .where(and(eq(sessions.userId, userId), eq(messages.role, 'user')));
    return row?.value ?? 0;
  },
};
