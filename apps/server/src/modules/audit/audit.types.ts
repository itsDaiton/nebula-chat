import type { z } from 'zod';
import type { AuditActorType } from '@nebula-chat/db';
import type {
  auditEntryDetailSchema,
  listAuditQuerySchema,
} from '@server/modules/audit/audit.validation';

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

export type AuditFilters = Omit<ListAuditQuery, 'limit' | 'cursor' | 'order'>;

export type AuditOrder = ListAuditQuery['order'];

/** One Audit log entry to append; `detail` holds ids and changed fields, never Message content. */
export type AuditEntryInput = {
  actorType: AuditActorType;
  actorUserId?: string | null;
  targetType: string;
  targetId: string;
} & z.input<typeof auditEntryDetailSchema>;
