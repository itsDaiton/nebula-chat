import { getListAuditEntriesQueryOptions } from '@/libs/api/generated/admin/admin';
import type { ListAuditEntriesParams } from '@/libs/api/generated/model/listAuditEntriesParams';
import type { AdminPage, AuditSearch } from '@/modules/admin/types/types';
import type { AuditEntry } from '@/libs/api/generated/model/auditEntry';
import type { AuditPage } from '@/libs/api/generated/model/auditPage';

const AUDIT_PAGE_SIZE = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (day: string) => `${day}T00:00:00Z`;

// `to` is exclusive on the API, so the last chosen day is included by stopping at the next midnight.
const startOfNextDay = (day: string) =>
  `${new Date(Date.parse(startOfDay(day)) + DAY_MS).toISOString().slice(0, 10)}T00:00:00Z`;

const auditParams = ({
  actor,
  action,
  target,
  from,
  to,
  cursor,
}: AuditSearch): ListAuditEntriesParams => ({
  limit: AUDIT_PAGE_SIZE,
  actorType: actor,
  action,
  targetId: target,
  from: from ? startOfDay(from) : undefined,
  to: to ? startOfNextDay(to) : undefined,
  cursor,
});

export const auditQueryOptions = (search: AuditSearch) => ({
  ...getListAuditEntriesQueryOptions(auditParams(search)),
  select: ({ entries, nextCursor }: AuditPage): AdminPage<AuditEntry> => ({
    rows: entries,
    nextCursor,
  }),
});
