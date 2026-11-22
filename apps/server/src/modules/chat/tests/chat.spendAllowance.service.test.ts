import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '@server/env';

vi.mock('@server/modules/modelCall/modelCall.repository', () => ({
  modelCallRepository: { sumCostUsd: vi.fn() },
}));

import { getSpendAllowance } from '@server/modules/chat/chat.spendAllowance.service';
import { modelCallRepository } from '@server/modules/modelCall/modelCall.repository';

const mockedSum = vi.mocked(modelCallRepository.sumCostUsd);
const BUDGET = env.SPEND_ALLOWANCE_USD;
const USER_ID = '77777777-7777-4777-8777-777777777777';
const verified = { id: USER_ID, isAnonymous: false, emailVerified: true, role: 'user' };
const NOW = new Date('2026-11-21T10:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSpendAllowance', () => {
  it('does not cap an Admin and never reads the ledger', async () => {
    await expect(getSpendAllowance({ ...verified, role: 'admin' }, NOW)).resolves.toEqual({
      capped: false,
    });
    expect(mockedSum).not.toHaveBeenCalled();
  });

  it('sums the UTC month so far and reports the reset at the next month start', async () => {
    mockedSum.mockResolvedValue(0.4);

    await expect(getSpendAllowance(verified, NOW)).resolves.toEqual({
      capped: true,
      limit: BUDGET,
      used: 0.4,
      remaining: BUDGET - 0.4,
      resetsAt: '2026-12-01T00:00:00.000Z',
    });
    expect(mockedSum).toHaveBeenCalledWith(
      USER_ID,
      new Date('2026-11-01T00:00:00Z'),
      new Date('2026-12-01T00:00:00Z'),
    );
  });

  it('reports 0 remaining exactly at the budget', async () => {
    mockedSum.mockResolvedValue(BUDGET);

    await expect(getSpendAllowance(verified, NOW)).resolves.toMatchObject({ remaining: 0 });
  });

  it('keeps one cent under the budget allowed', async () => {
    mockedSum.mockResolvedValue(BUDGET - 0.01);

    const allowance = await getSpendAllowance(verified, NOW);

    expect(allowance).toMatchObject({ capped: true });
    expect(allowance.capped && allowance.remaining).toBeCloseTo(0.01, 6);
  });

  it('clamps remaining at 0 but reports the raw sum when over the budget', async () => {
    mockedSum.mockResolvedValue(BUDGET + 0.01);

    await expect(getSpendAllowance(verified, NOW)).resolves.toMatchObject({
      used: BUDGET + 0.01,
      remaining: 0,
    });
  });

  it('starts a new window at the month boundary', async () => {
    mockedSum.mockResolvedValue(0);

    const allowance = await getSpendAllowance(verified, new Date('2026-12-01T00:00:00Z'));

    expect(allowance).toMatchObject({ resetsAt: '2027-01-01T00:00:00.000Z' });
    expect(mockedSum).toHaveBeenCalledWith(
      USER_ID,
      new Date('2026-12-01T00:00:00Z'),
      new Date('2027-01-01T00:00:00Z'),
    );
  });

  it('reports a User with no rows (or only purged ones) as nothing spent', async () => {
    mockedSum.mockResolvedValue(0);

    await expect(getSpendAllowance(verified, NOW)).resolves.toMatchObject({
      used: 0,
      remaining: BUDGET,
    });
  });

  it.each([
    ['a Guest', { id: USER_ID, isAnonymous: true, emailVerified: false }],
    ['an unverified Registered user', { id: USER_ID, isAnonymous: false, emailVerified: false }],
  ])('leaves %s uncapped without summing', async (_label, user) => {
    await expect(getSpendAllowance(user, NOW)).resolves.toEqual({ capped: false });
    expect(mockedSum).not.toHaveBeenCalled();
  });
});
