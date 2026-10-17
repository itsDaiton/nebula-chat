import type { MessageAllowance } from '@/libs/api/generated/model/messageAllowance';

/** A Metered user's allowance with `remaining` of `limit` messages left. */
export const aMeteredAllowance = (remaining: number, limit = 10): MessageAllowance => ({
  metered: true,
  limit,
  used: limit - remaining,
  remaining,
});
