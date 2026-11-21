import type { AdminUserDetail } from '@/libs/api/generated/model/adminUserDetail';
import type { UserActionContext, UserActionRules } from '@/modules/admin/types/types';
import { resources } from '@/resources';

const { reasons } = resources.admin.users.actions;

// A convenience mirror of the API's refusals; the server stays the authority.
export const userActionRules = (
  user: AdminUserDetail,
  { lastAdmin, self }: UserActionContext,
): UserActionRules => {
  const isAdmin = user.role === 'admin';
  const isBanned = user.ban !== null;

  const role = (): string | undefined => {
    if (isAdmin) return lastAdmin ? reasons.lastAdmin : undefined;
    if (user.status === 'guest') return reasons.guest;
    if (user.status === 'unverified') return reasons.unverified;
    if (isBanned) return reasons.banned;
    return undefined;
  };

  const ban = (): string | undefined => {
    if (isBanned) return undefined;
    if (self) return reasons.self;
    if (isAdmin && lastAdmin) return reasons.lastAdmin;
    return undefined;
  };

  return {
    role: { disabledReason: role() },
    ban: { disabledReason: ban() },
    restore: { disabledReason: user.pendingDeletionAt ? undefined : reasons.notPending },
  };
};
