import type { z } from 'zod';
import type {
  adminEmailParamsSchema,
  grantAdminSchema,
  banUserSchema,
  listUserSessionsQuerySchema,
  listUsersQuerySchema,
  sessionIdParamsSchema,
  setRoleSchema,
  userIdParamsSchema,
} from '@server/modules/admin/admin.validation';

export type GrantAdminDTO = z.infer<typeof grantAdminSchema>;

export type AdminEmailParams = z.infer<typeof adminEmailParamsSchema>;

export type AdminRole = 'admin' | 'user';

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export type UserFilters = Pick<ListUsersQuery, 'search' | 'status' | 'sortBy' | 'order'>;

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export type SetRoleDTO = z.infer<typeof setRoleSchema>;

export type BanUserDTO = z.infer<typeof banUserSchema>;

export type ListUserSessionsQuery = z.infer<typeof listUserSessionsQuerySchema>;

export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;
