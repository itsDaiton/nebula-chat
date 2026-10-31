import { z } from 'zod';
import { AUDIT_ACTIONS, AUDIT_ACTOR_TYPES } from '@nebula-chat/db';
import { paginationConfig } from '@server/config/pagination.config';
import { isoDateTimeSchema } from '@server/utils/isoDateTimeSchema';

const timeQuerySchema = z.iso.datetime().transform((iso) => new Date(iso));

export const listAuditQuerySchema = z.object({
  actorType: z.enum(AUDIT_ACTOR_TYPES).optional().describe('Only entries by this kind of actor'),
  actorUserId: z.uuid().optional().describe('Only entries by this Admin'),
  action: z.enum(AUDIT_ACTIONS).optional(),
  targetType: z
    .string()
    .min(1)
    .max(50)
    .optional()
    .describe('Only entries about this kind of record, e.g. `user`'),
  targetId: z.string().min(1).max(100).optional().describe('Only entries about this record'),
  from: timeQuerySchema.optional().describe('Only entries at or after this time'),
  to: timeQuerySchema.optional().describe('Only entries before this time'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(paginationConfig.maxLimit)
    .default(paginationConfig.defaultLimit)
    .describe(
      `Number of entries to fetch (1-${String(paginationConfig.maxLimit)}, default ${String(paginationConfig.defaultLimit)})`,
    ),
  cursor: z.uuid().optional().describe('The `nextCursor` of the previous page'),
});

const auditEntrySchema = z
  .object({
    id: z.uuid(),
    actorType: z.enum(AUDIT_ACTOR_TYPES),
    actorUserId: z
      .uuid()
      .nullable()
      .describe('The Admin who acted; `null` for the Operator or the system'),
    action: z.enum(AUDIT_ACTIONS),
    targetType: z.string(),
    targetId: z.string(),
    detail: z
      .record(z.string(), z.unknown())
      .describe('Ids and changed fields; never Message content'),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'AuditEntry' });

export const auditPageSchema = z
  .object({
    entries: z.array(auditEntrySchema).max(paginationConfig.maxLimit).describe('Newest first'),
    nextCursor: z.uuid().nullable(),
    hasMore: z.boolean(),
  })
  .meta({ id: 'AuditPage' });
