import { and, asc, count, desc, eq, gt, gte, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { auditEntries, users } from '@nebula-chat/db';
import { db } from '@server/db';
import type { AuditEntryInput, AuditFilters, AuditOrder } from '@server/modules/audit/audit.types';

const when = <T>(value: T | undefined, filter: (present: T) => SQL) =>
  value === undefined ? undefined : filter(value);

const filterConditions = (filters: AuditFilters) => [
  when(filters.actorType, (v) => eq(auditEntries.actorType, v)),
  when(filters.actorUserId, (v) => eq(auditEntries.actorUserId, v)),
  when(filters.action, (v) => eq(auditEntries.action, v)),
  when(filters.targetType, (v) => eq(auditEntries.targetType, v)),
  when(filters.targetId, (v) => eq(auditEntries.targetId, v)),
  when(filters.from, (v) => gte(auditEntries.createdAt, v)),
  when(filters.to, (v) => lt(auditEntries.createdAt, v)),
];

const actor = alias(users, 'actor');
const target = alias(users, 'target');

// `target_id` is free text: the guard keeps a non-UUID id from failing the cast, and leaves the users pkey usable.
const targetUserId = sql`case when ${auditEntries.targetId} ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ${auditEntries.targetId}::uuid end`;

// The Audit log is append-only (GLOSSARY.md): this repository has no update or delete.
export const auditRepository = {
  async insert(entry: AuditEntryInput) {
    await db.insert(auditEntries).values(entry);
  },
  async list(filters: AuditFilters, limit: number, order: AuditOrder, cursor?: string) {
    const ascending = order === 'asc';
    const compare = ascending ? gt : lt;
    const sortBy = ascending ? asc : desc;

    let cursorFilter;
    if (cursor) {
      const [cursorRow] = await db
        .select({ createdAt: auditEntries.createdAt, id: auditEntries.id })
        .from(auditEntries)
        .where(eq(auditEntries.id, cursor));
      cursorFilter =
        cursorRow &&
        or(
          compare(auditEntries.createdAt, cursorRow.createdAt),
          and(
            eq(auditEntries.createdAt, cursorRow.createdAt),
            compare(auditEntries.id, cursorRow.id),
          ),
        );
    }

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          entry: auditEntries,
          actorName: actor.name,
          targetLabel: target.email,
        })
        .from(auditEntries)
        .leftJoin(actor, eq(actor.id, auditEntries.actorUserId))
        .leftJoin(
          target,
          and(eq(auditEntries.targetType, 'user'), sql`${target.id} = ${targetUserId}`),
        )
        .where(and(...filterConditions(filters), cursorFilter))
        .orderBy(sortBy(auditEntries.createdAt), sortBy(auditEntries.id))
        .limit(limit + 1),
      db
        .select({ total: count() })
        .from(auditEntries)
        .where(and(...filterConditions(filters))),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, -1) : rows;
    const entries = page.map(({ entry, actorName, targetLabel }) => ({
      ...entry,
      actorName: entry.actorType === 'admin' ? actorName : null,
      targetLabel,
    }));
    const nextCursor = hasMore ? (entries.at(-1)?.id ?? null) : null;

    return { entries, nextCursor, hasMore, total: totalRow?.total ?? 0 };
  },
};
