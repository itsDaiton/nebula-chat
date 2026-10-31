import { z } from 'zod';
import { paginationConfig } from '@server/config/pagination.config';
import { isoDateTimeSchema } from '@server/utils/isoDateTimeSchema';

// Lowercased, as better-auth stores every email.
const emailSchema = z.email().transform((email) => email.toLowerCase());

export const grantAdminSchema = z.object({
  email: emailSchema.describe('The email of the verified Registered user to make an Admin'),
});

export const adminEmailParamsSchema = z.object({
  email: emailSchema.describe('The email of the Admin'),
});

export const adminSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
    twoFactorEnabled: z
      .boolean()
      .describe(
        'Whether they have enrolled in two-factor authentication, without which the admin API refuses them',
      ),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'Admin' });

// A bound for the spec (checkov CKV_OPENAPI_21), far above any Admin count we run.
export const adminsSchema = z.array(adminSchema).max(100);

const USER_STATUSES = [
  'registered',
  'unverified',
  'admin',
  'banned',
  'pendingDeletion',
  'guest',
] as const;

const USER_SORTS = ['createdAt', 'lastActiveAt', 'messagesSent'] as const;

export const listUsersQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Case-insensitive text to find in the name or email'),
  status: z
    .enum(USER_STATUSES)
    .optional()
    .describe('Only Users in this status; without it every User but Guests is listed'),
  sortBy: z
    .enum(USER_SORTS)
    .default('createdAt')
    .describe('`lastActiveAt` is the last update to the account until activity is tracked'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(paginationConfig.maxLimit)
    .default(paginationConfig.defaultLimit)
    .describe(
      `Number of Users to fetch (1-${String(paginationConfig.maxLimit)}, default ${String(paginationConfig.defaultLimit)})`,
    ),
  cursor: z.uuid().optional().describe('The `nextCursor` of the previous page'),
});

export const userIdParamsSchema = z.object({ id: z.uuid().describe('The User id') });

const userSummaryShape = {
  id: z.uuid(),
  // A Guest's generated address may lack a TLD (`temp-…@localhost`), which z.email() rejects.
  email: z.string(),
  name: z.string(),
  status: z
    .enum(USER_STATUSES)
    .describe('The first that applies: guest, banned, admin, unverified, registered'),
  twoFactorEnabled: z.boolean(),
  messagesSent: z.number().int().describe('Messages the User sent, across their Sessions'),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
};

const userSummarySchema = z.object(userSummaryShape).meta({ id: 'AdminUserSummary' });

export const userPageSchema = z
  .object({
    users: z.array(userSummarySchema).max(paginationConfig.maxLimit),
    nextCursor: z.uuid().nullable(),
    hasMore: z.boolean(),
  })
  .meta({ id: 'AdminUserPage' });

export const userDetailSchema = z
  .object({
    ...userSummaryShape,
    ban: z
      .object({
        reason: z.string().nullable(),
        expiresAt: isoDateTimeSchema.nullable().describe('`null` for a ban with no end'),
      })
      .nullable()
      .describe('`null` unless the User is banned now'),
    pendingDeletionAt: isoDateTimeSchema
      .nullable()
      .describe('When the account will be deleted; `null` until deletion can be requested'),
    sessionsCount: z.number().int(),
  })
  .meta({ id: 'AdminUserDetail' });
