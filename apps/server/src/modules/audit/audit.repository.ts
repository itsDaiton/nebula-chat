import { and, desc, eq, gte, lt, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { auditEntries } from '@nebula-chat/db';
import { db } from '@server/db';
import type { AuditEntryInput, AuditFilters } from '@server/modules/audit/audit.types';

const when = <T>(value: T | undefined, filter: (present: T) => SQL) =>
  value === undefined ? undefined : filter(value);

// The Audit log is append-only (GLOSSARY.md): this repository has no update or delete.
export const auditRepository = {
  async insert(entry: AuditEntryInput) {
    await db.insert(auditEntries).values(entry);
  },
  async list(filters: AuditFilters, limit: number, cursor?: string) {
    let cursorFilter;
    if (cursor) {
      const [cursorRow] = await db
        .select({ createdAt: auditEntries.createdAt, id: auditEntries.id })
        .from(auditEntries)
        .where(eq(auditEntries.id, cursor));
      cursorFilter =
        cursorRow &&
        or(
          lt(auditEntries.createdAt, cursorRow.createdAt),
          and(eq(auditEntries.createdAt, cursorRow.createdAt), lt(auditEntries.id, cursorRow.id)),
        );
    }

    const rows = await db
      .select()
      .from(auditEntries)
      .where(
        and(
          when(filters.actorType, (v) => eq(auditEntries.actorType, v)),
          when(filters.actorUserId, (v) => eq(auditEntries.actorUserId, v)),
          when(filters.action, (v) => eq(auditEntries.action, v)),
          when(filters.targetType, (v) => eq(auditEntries.targetType, v)),
          when(filters.targetId, (v) => eq(auditEntries.targetId, v)),
          when(filters.from, (v) => gte(auditEntries.createdAt, v)),
          when(filters.to, (v) => lt(auditEntries.createdAt, v)),
          cursorFilter,
        ),
      )
      .orderBy(desc(auditEntries.createdAt), desc(auditEntries.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const entries = hasMore ? rows.slice(0, -1) : rows;
    const nextCursor = hasMore ? (entries.at(-1)?.id ?? null) : null;

    return { entries, nextCursor, hasMore };
  },
};
