import { z } from 'zod';
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
