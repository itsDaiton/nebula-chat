import type { MessageAllowance } from '@/libs/api/generated/model/messageAllowance';
import type { SpendAllowance } from '@/libs/api/generated/model/spendAllowance';

/** A Metered user's allowance with `remaining` of `limit` messages left. */
export const aMeteredAllowance = (remaining: number, limit = 10): MessageAllowance => ({
  metered: true,
  limit,
  used: limit - remaining,
  remaining,
});

/** A verified user's Spend allowance with `remaining` of `limit` USD left, resetting on 1 Dec 2026 (UTC). */
export const aCappedSpendAllowance = (remaining: number, limit = 1): SpendAllowance => ({
  capped: true,
  limit,
  used: limit - remaining,
  remaining,
  resetsAt: '2026-12-01T00:00:00.000Z',
});
