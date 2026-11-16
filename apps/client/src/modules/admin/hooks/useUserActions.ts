import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getGetUserQueryKey,
  getListAuditEntriesQueryKey,
  getListUsersQueryKey,
  useBanUser,
  useRestoreUser,
  useSetUserRole,
  useUnbanUser,
} from '@/libs/api/generated/admin/admin';
import type { AdminUserDetail } from '@/libs/api/generated/model/adminUserDetail';
import { resources } from '@/resources';

const { actions: text } = resources.admin.users;

/** The four User actions: each refreshes the table and detail, then toasts; a refusal is toasted by the query client. */
export const useUserActions = (user: AdminUserDetail) => {
  const queryClient = useQueryClient();
  const who = user.email;

  const refreshed = (message: string) => ({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(user.id) }),
          queryClient.invalidateQueries({ queryKey: getListAuditEntriesQueryKey() }),
        ]);
        toast.success(message);
      },
    },
  });

  const grant = useSetUserRole(refreshed(text.granted(who)));
  const revoke = useSetUserRole(refreshed(text.revoked(who)));
  const ban = useBanUser(refreshed(text.banned(who)));
  const unban = useUnbanUser(refreshed(text.unbanned(who)));
  const restore = useRestoreUser(refreshed(text.restored(who)));

  return { grant, revoke, ban, unban, restore };
};
