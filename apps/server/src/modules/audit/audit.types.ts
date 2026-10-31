import type { z } from 'zod';
import type { AuditAction, AuditActorType } from '@nebula-chat/db';
import type { listAuditQuerySchema } from '@server/modules/audit/audit.validation';

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

export type AuditFilters = Omit<ListAuditQuery, 'limit' | 'cursor'>;

/** One Audit log entry to append; `detail` holds ids and changed fields, never Message content. */
export type AuditEntryInput = {
  actorType: AuditActorType;
  actorUserId?: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string;
  detail?: Record<string, unknown>;
};
