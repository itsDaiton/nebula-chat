import { useListUsers } from '@/libs/api/generated/admin/admin';
import type { AdminUserDetail } from '@/libs/api/generated/model/adminUserDetail';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { userActionRules } from '@/modules/admin/utils/userActionRules';

/** The disabled state of each action for this User; the last-Admin check mirrors the server: another Admin who is not banned, Pending-deletion included. */
export const useUserActionRules = (user: AdminUserDetail) => {
  const { user: me } = useAuth();
  const isAdmin = user.role === 'admin';
  const { data } = useListUsers(
    { role: 'admin', banned: 'false', limit: 2 },
    { query: { enabled: isAdmin, meta: { inlineError: true } } },
  );

  return userActionRules(user, {
    lastAdmin: isAdmin && data !== undefined && !data.users.some(({ id }) => id !== user.id),
    self: me?.id === user.id,
  });
};
