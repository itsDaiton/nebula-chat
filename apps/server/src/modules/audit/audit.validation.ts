import { z } from 'zod';
import { AUDIT_ACTIONS, AUDIT_ACTOR_TYPES } from '@nebula-chat/db';
import type { AuditAction } from '@nebula-chat/db';
import { LOG_COMPONENTS, LOG_LEVEL_SERVICES, LOG_LEVELS } from '@nebula-chat/otel';
import { paginationConfig } from '@server/config/pagination.config';
import { isoDateTimeSchema } from '@server/utils/isoDateTimeSchema';

const AUDIT_ORDERS = ['asc', 'desc'] as const;

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
  order: z
    .enum(AUDIT_ORDERS)
    .default('desc')
    .describe('Sort by time: `desc` newest first (default) or `asc` oldest first'),
});

const roleChange = { role: z.object({ from: z.string(), to: z.string() }) };

// Ids and changed fields only, never Message content: the one place a key is allowed on an entry.
const detailShapes = {
  adminGranted: roleChange,
  roleChanged: roleChange,
  banned: {
    reason: z.string().nullable(),
    note: z.string().nullable(),
    expiresAt: z.string().nullable(),
  },
  unbanned: { reason: z.string().nullable() },
  restored: { pendingDeletionAt: z.string() },
  sessionRead: { userId: z.string() },
  runRead: { userId: z.string(), sessionId: z.string() },
  purged: { pendingUsers: z.int(), guests: z.int(), failed: z.int() },
  logLevelChanged: {
    service: z.enum(Object.keys(LOG_LEVEL_SERVICES) as [keyof typeof LOG_LEVEL_SERVICES]),
    target: z.enum(['root', ...LOG_COMPONENTS]),
    level: z.enum(LOG_LEVELS),
    ttlSeconds: z.int(),
  },
} satisfies Record<string, z.ZodRawShape>;

// Strict, so a key the action does not allow fails the write.
export const auditEntryDetailSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('admin.granted'),
    detail: z.strictObject(detailShapes.adminGranted),
  }),
  z.object({
    action: z.literal('user.role_changed'),
    detail: z.strictObject(detailShapes.roleChanged),
  }),
  z.object({ action: z.literal('user.banned'), detail: z.strictObject(detailShapes.banned) }),
  z.object({ action: z.literal('user.unbanned'), detail: z.strictObject(detailShapes.unbanned) }),
  z.object({ action: z.literal('user.restored'), detail: z.strictObject(detailShapes.restored) }),
  z.object({ action: z.literal('session.read'), detail: z.strictObject(detailShapes.sessionRead) }),
  z.object({ action: z.literal('run.read'), detail: z.strictObject(detailShapes.runRead) }),
  z.object({ action: z.literal('users.purged'), detail: z.strictObject(detailShapes.purged) }),
  z.object({
    action: z.literal('log_level.changed'),
    detail: z.strictObject(detailShapes.logLevelChanged),
  }),
]);

const auditEntryBaseShape = {
  id: z.uuid(),
  actorType: z.enum(AUDIT_ACTOR_TYPES),
  actorUserId: z
    .uuid()
    .nullable()
    .describe('The Admin who acted; `null` for the Operator or the system'),
  actorName: z
    .string()
    .nullable()
    .describe("The acting Admin's name; `null` for the Operator, the system or a purged Admin"),
  targetType: z.string(),
  targetId: z.string(),
  targetLabel: z
    .string()
    .nullable()
    .describe("The User's email when the target is a User that still exists; otherwise `null`"),
  createdAt: isoDateTimeSchema,
};

const readVariant = <A extends AuditAction, S extends z.ZodRawShape>(action: A, shape: S) =>
  z.object({
    ...auditEntryBaseShape,
    action: z.literal(action),
    detail: z.object(shape).describe('Ids and changed fields; never Message content'),
  });

// A row carrying a key its action does not allow is stripped of it on the way out.
const auditEntrySchema = z
  .discriminatedUnion('action', [
    readVariant('admin.granted', detailShapes.adminGranted),
    readVariant('user.role_changed', detailShapes.roleChanged),
    readVariant('user.banned', detailShapes.banned),
    readVariant('user.unbanned', detailShapes.unbanned),
    readVariant('user.restored', detailShapes.restored),
    readVariant('session.read', detailShapes.sessionRead),
    readVariant('run.read', detailShapes.runRead),
    readVariant('users.purged', detailShapes.purged),
    readVariant('log_level.changed', detailShapes.logLevelChanged),
  ])
  .meta({ id: 'AuditEntry' });

export const auditPageSchema = z
  .object({
    entries: z
      .array(auditEntrySchema)
      .max(paginationConfig.maxLimit)
      .describe('In the requested `order`'),
    nextCursor: z.uuid().nullable(),
    total: z.int().min(0).describe('Entries matching the filters, ignoring `cursor` and `limit`'),
    hasMore: z.boolean(),
  })
  .meta({ id: 'AuditPage' });
