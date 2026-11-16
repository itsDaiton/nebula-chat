import { useListUsers } from '@/libs/api/generated/admin/admin';
import type { AdminUserDetail } from '@/libs/api/generated/model/adminUserDetail';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { userActionRules } from '@/modules/admin/utils/userActionRules';

/** The disabled state of each action for this User; the last-Admin check reads the Admin list. */
export const useUserActionRules = (user: AdminUserDetail) => {
  const { user: me } = useAuth();
  const isAdmin = user.status === 'admin';
  const { data } = useListUsers(
    { status: ['admin'], limit: 2 },
    { query: { enabled: isAdmin, meta: { inlineError: true } } },
  );

  return userActionRules(user, {
    lastAdmin: isAdmin && (data?.users.length ?? 2) <= 1,
    self: me?.id === user.id,
  });
};
