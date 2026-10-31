import type { z } from 'zod';
import type {
  adminEmailParamsSchema,
  grantAdminSchema,
} from '@server/modules/admin/admin.validation';

export type GrantAdminDTO = z.infer<typeof grantAdminSchema>;

export type AdminEmailParams = z.infer<typeof adminEmailParamsSchema>;

export type AdminRole = 'admin' | 'user';
