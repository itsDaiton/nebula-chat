import type { z } from 'zod';
import type {
  adminEmailParamsSchema,
  grantAdminSchema,
  banUserSchema,
  listRunsQuerySchema,
  listSessionsQuerySchema,
  listUserSessionsQuerySchema,
  listUsersQuerySchema,
  overviewQuerySchema,
  sessionIdParamsSchema,
  setRoleSchema,
  userIdParamsSchema,
} from '@server/modules/admin/admin.validation';

export type GrantAdminDTO = z.infer<typeof grantAdminSchema>;

export type AdminEmailParams = z.infer<typeof adminEmailParamsSchema>;

export type AdminRole = 'admin' | 'user';

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export type UserFilters = Pick<
  ListUsersQuery,
  'search' | 'status' | 'role' | 'banned' | 'sortBy' | 'order'
>;

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export type SetRoleDTO = z.infer<typeof setRoleSchema>;

export type BanUserDTO = z.infer<typeof banUserSchema>;

export type ListUserSessionsQuery = z.infer<typeof listUserSessionsQuerySchema>;

export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

export type SessionFilters = Omit<ListSessionsQuery, 'limit' | 'cursor'>;

export type ListRunsQuery = z.infer<typeof listRunsQuerySchema>;

export type RunFilters = Omit<ListRunsQuery, 'limit' | 'cursor'>;

export type OverviewRange = z.infer<typeof overviewQuerySchema>['range'];

export type OverviewQuery = z.infer<typeof overviewQuerySchema>;

export type DayCount = { day: string; count: number };

export type OverviewCounts = {
  dailyActive: DayCount[];
  weeklyActive: DayCount[];
  registrations: DayCount[];
  conversions: DayCount[];
  guests: DayCount[];
  messages: DayCount[];
  spend: DayCount[];
};
