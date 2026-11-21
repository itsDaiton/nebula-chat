import type { User } from '@nebula-chat/auth';
import { env } from '@server/env';
import type { SpendAllowance } from '@server/modules/chat/chat.types';
import { modelCallRepository } from '@server/modules/modelCall/modelCall.repository';

type AllowanceUser = Pick<User, 'id' | 'isAnonymous' | 'emailVerified'>;

// Cost is stored to 6 decimals; rounding keeps float sums from straddling the budget.
const roundUsd = (value: number): number => Math.round(value * 1e6) / 1e6;

/** The one place that sums a User's Operator-key spend, so a later ticket can exclude Own key calls here. */
const spentThisMonth = (userId: string, from: Date, to: Date): Promise<number> =>
  modelCallRepository.sumCostUsd(userId, from, to);

/** Applies to a verified Registered user only; Metered users keep the Message allowance (GLOSSARY.md). */
export const getSpendAllowance = async (
  user: AllowanceUser,
  now: Date = new Date(),
): Promise<SpendAllowance> => {
  if (user.isAnonymous || !user.emailVerified) {
    return { capped: false };
  }

  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const limit = env.SPEND_ALLOWANCE_USD;
  const used = roundUsd(await spentThisMonth(user.id, from, resetsAt));
  return {
    capped: true,
    limit,
    used,
    remaining: roundUsd(Math.max(0, limit - used)),
    resetsAt: resetsAt.toISOString(),
  };
};
