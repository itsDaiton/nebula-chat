import type { z } from 'zod';
import type {
  adminEmailParamsSchema,
  grantAdminSchema,
  listUsersQuerySchema,
  userIdParamsSchema,
} from '@server/modules/admin/admin.validation';

export type GrantAdminDTO = z.infer<typeof grantAdminSchema>;

export type AdminEmailParams = z.infer<typeof adminEmailParamsSchema>;

export type AdminRole = 'admin' | 'user';

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export type UserFilters = Pick<ListUsersQuery, 'search' | 'status' | 'sortBy' | 'order'>;

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
