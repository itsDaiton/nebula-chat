import { eq, asc, desc, and, count, isNotNull, sql, getTableColumns } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { messages, modelCalls, sessions } from '@nebula-chat/db';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@server/db';
import type {
  CreateMessageDTO,
  GetMessageParams,
  MessageHistoryRow,
  MessageRow,
  MessageWithMetaRow,
} from '@server/modules/message/message.types';

// A Direct reply's call links to its Message; a Run's calls sum under the Run. Both joins stay in the one query.
const directCall = alias(modelCalls, 'direct_call');

const messageMeta = (userId: string) => {
  const runCost = db
    .select({
      runId: modelCalls.runId,
      costUsd: sql<number>`sum(${modelCalls.costUsd})::float8`.as('cost_usd'),
    })
    .from(modelCalls)
    .where(and(eq(modelCalls.userId, userId), isNotNull(modelCalls.runId)))
    .groupBy(modelCalls.runId)
    .as('run_cost');
  return {
    runCost,
    columns: {
      ...getTableColumns(messages),
      model: sql<string | null>`${directCall.model}`,
      // Qualified by hand: Drizzle renders a sub-select field bare, which `direct_call.cost_usd` makes ambiguous.
      estimatedCostUsd: sql<
        number | null
      >`coalesce(${directCall.costUsd}, ${sql.identifier('run_cost')}.${sql.identifier('cost_usd')})`,
      contextTokens: sql<
        number | null
      >`${directCall.inputTokens} + ${directCall.cachedInputTokens}`,
      contextMessages: sql<number | null>`${directCall.contextMessages}`,
    },
  };
};

export const messageRepository: {
  create: (data: CreateMessageDTO) => Promise<MessageRow>;
  findById: (params: GetMessageParams, userId: string) => Promise<MessageWithMetaRow | null>;
  findAll: (userId: string, sessionId?: string) => Promise<MessageWithMetaRow[]>;
  createTx: (tx: DbTransaction, data: CreateMessageDTO & { runId?: string }) => Promise<MessageRow>;
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
  // Reads are owner-scoped through the message's session (ADR-0010 §2): another user's message reads as absent.
  async findById({ messageId }: GetMessageParams, userId: string) {
    const { runCost, columns } = messageMeta(userId);
    const [row] = await db
      .select(columns)
      .from(messages)
      .innerJoin(sessions, eq(messages.sessionId, sessions.id))
      .leftJoin(directCall, eq(directCall.messageId, messages.id))
      .leftJoin(runCost, eq(runCost.runId, messages.runId))
      .where(and(eq(messages.id, messageId), eq(sessions.userId, userId)));
    return row ?? null;
  },
  // Narrowing to one session stays inside the owner join, so another user's session reads as empty; one session is oldest first.
  async findAll(userId: string, sessionId?: string) {
    const { runCost, columns } = messageMeta(userId);
    return db
      .select(columns)
      .from(messages)
      .innerJoin(sessions, eq(messages.sessionId, sessions.id))
      .leftJoin(directCall, eq(directCall.messageId, messages.id))
      .leftJoin(runCost, eq(runCost.runId, messages.runId))
      .where(
        and(
          eq(sessions.userId, userId),
          sessionId === undefined ? undefined : eq(messages.sessionId, sessionId),
        ),
      )
      .orderBy(sessionId === undefined ? desc(messages.createdAt) : asc(messages.createdAt));
  },
  async createTx(tx: DbTransaction, data: CreateMessageDTO & { runId?: string }) {
    const { sessionId, content, role, tokenCount, runId } = data;
    const [row] = await tx
      .insert(messages)
      .values({ sessionId, content, role, tokenCount: tokenCount ?? null, runId: runId ?? null })
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
    // Guest message allowance (ADR-0010 §4): the owner's live count of `user` messages, joined through their sessions.
    const [row] = await db
      .select({ value: count() })
      .from(messages)
      .innerJoin(sessions, eq(messages.sessionId, sessions.id))
      .where(and(eq(sessions.userId, userId), eq(messages.role, 'user')));
    return row?.value ?? 0;
  },
};
