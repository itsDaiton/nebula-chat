import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@server/modules/admin/admin.repository', () => ({
  adminRepository: { overviewCounts: vi.fn(), listRuns: vi.fn() },
}));
vi.mock('@server/auth', () => ({ auth: {} }));

import { adminRepository } from '@server/modules/admin/admin.repository';
import { adminService } from '@server/modules/admin/admin.service';

const repo = vi.mocked(adminRepository);

const NOW = new Date('2026-11-10T15:30:00.000Z');
const empty = {
  dailyActive: [],
  weeklyActive: [],
  registrations: [],
  conversions: [],
  guests: [],
  messages: [],
  spend: [],
};

describe('adminService.getOverview', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('spans the last N UTC days ending today and asks for the previous period too', async () => {
    repo.overviewCounts.mockResolvedValue(empty);

    const overview = await adminService.getOverview('7d', NOW);

    expect(overview.days).toEqual([
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
    ]);
    expect(repo.overviewCounts).toHaveBeenCalledWith('2026-10-28', '2026-11-10');
  });

  it('zero-fills days without rows and splits totals by period', async () => {
    repo.overviewCounts.mockResolvedValue({
      ...empty,
      messages: [
        { day: '2026-10-30', count: 5 },
        { day: '2026-11-04', count: 10 },
        { day: '2026-11-10', count: 20 },
      ],
      registrations: [
        { day: '2026-10-28', count: 1 },
        { day: '2026-11-05', count: 3 },
      ],
    });

    const { kpis } = await adminService.getOverview('7d', NOW);

    expect(kpis.messagesSent).toEqual({
      total: 30,
      previousTotal: 5,
      series: [10, 0, 0, 0, 0, 0, 20],
    });
    expect(kpis.newRegistrations.total).toBe(3);
    expect(kpis.newRegistrations.previousTotal).toBe(1);
  });

  it('sums estimated spend per day without rounding it to whole dollars', async () => {
    repo.overviewCounts.mockResolvedValue({
      ...empty,
      spend: [
        { day: '2026-10-30', count: 0.25 },
        { day: '2026-11-04', count: 1.5 },
        { day: '2026-11-10', count: 0.125 },
      ],
    });

    const { kpis } = await adminService.getOverview('7d', NOW);

    expect(kpis.estimatedSpend).toEqual({
      total: 1.625,
      previousTotal: 0.25,
      series: [1.5, 0, 0, 0, 0, 0, 0.125],
    });
  });

  it('averages daily active Users and takes the last weekly window', async () => {
    repo.overviewCounts.mockResolvedValue({
      ...empty,
      dailyActive: [
        { day: '2026-11-04', count: 7 },
        { day: '2026-11-10', count: 7 },
        { day: '2026-11-01', count: 14 },
      ],
      weeklyActive: [
        { day: '2026-11-10', count: 40 },
        { day: '2026-11-03', count: 30 },
      ],
    });

    const { kpis } = await adminService.getOverview('7d', NOW);

    expect(kpis.dailyActiveUsers.total).toBe(2);
    expect(kpis.dailyActiveUsers.previousTotal).toBe(2);
    expect(kpis.weeklyActiveUsers.total).toBe(40);
    expect(kpis.weeklyActiveUsers.previousTotal).toBe(30);
  });

  it('keeps a fractional mean of daily active Users instead of rounding it to 0', async () => {
    repo.overviewCounts.mockResolvedValue({
      ...empty,
      dailyActive: [
        { day: '2026-11-10', count: 3 },
        { day: '2026-11-01', count: 1 },
      ],
    });

    const { kpis } = await adminService.getOverview('7d', NOW);

    expect(kpis.dailyActiveUsers.total).toBe(0.4);
    expect(kpis.dailyActiveUsers.previousTotal).toBe(0.1);
  });

  it('computes the conversion rate from conversions and the Guests still waiting', async () => {
    repo.overviewCounts.mockResolvedValue({
      ...empty,
      conversions: [
        { day: '2026-11-05', count: 2 },
        { day: '2026-10-30', count: 1 },
      ],
      guests: [
        { day: '2026-11-06', count: 6 },
        { day: '2026-10-30', count: 3 },
      ],
    });

    const { kpis } = await adminService.getOverview('7d', NOW);

    expect(kpis.guestConversion.conversions).toBe(2);
    expect(kpis.guestConversion.rate).toBeCloseTo(0.25);
    expect(kpis.guestConversion.previousRate).toBeCloseTo(0.25);
    expect(kpis.guestConversion.series).toEqual([0, 2, 0, 0, 0, 0, 0]);
  });

  it('has no rate when nobody was a Guest in the period', async () => {
    repo.overviewCounts.mockResolvedValue(empty);

    const { kpis } = await adminService.getOverview('30d', NOW);

    expect(kpis.guestConversion.rate).toBeNull();
    expect(kpis.guestConversion.previousRate).toBeNull();
    expect(kpis.messagesSent.series).toHaveLength(30);
  });
});

describe('adminService.listRuns', () => {
  const aRun = (overrides: Record<string, unknown> = {}) => ({
    id: 'run-1',
    status: 'completed',
    startedAt: new Date('2026-10-27T21:14:00.000Z'),
    finishedAt: new Date('2026-10-27T21:15:12.000Z'),
    stepCount: 6,
    tokensUsed: 100,
    tokenBudget: 60_000,
    costUsd: 0.044,
    owner: { id: 'u1', name: 'Anna', email: 'anna@example.com' },
    session: { id: 's1', title: 'Plan' },
    ...overrides,
  });

  it('turns the finish time into a duration and keeps the owner email out', async () => {
    repo.listRuns.mockResolvedValue({ runs: [aRun()], nextCursor: null, hasMore: false } as never);

    const { runs } = await adminService.listRuns({ sortBy: 'startedAt', order: 'desc', limit: 10 });

    expect(runs[0]).toMatchObject({ durationMs: 72_000, owner: { id: 'u1', name: 'Anna' } });
    expect(runs[0]).not.toHaveProperty('finishedAt');
    expect(JSON.stringify(runs)).not.toContain('anna@example.com');
  });

  it('has no duration for a Run that has not finished, and keeps a null cost', async () => {
    repo.listRuns.mockResolvedValue({
      runs: [aRun({ status: 'running', finishedAt: null, costUsd: null })],
      nextCursor: null,
      hasMore: false,
    } as never);

    const { runs } = await adminService.listRuns({ sortBy: 'startedAt', order: 'desc', limit: 10 });

    expect(runs[0]).toMatchObject({ durationMs: null, costUsd: null });
  });

  it('passes the filters, limit and cursor to the repository', async () => {
    repo.listRuns.mockResolvedValue({ runs: [], nextCursor: null, hasMore: false });

    await adminService.listRuns({
      sortBy: 'cost',
      order: 'asc',
      status: ['failed'],
      limit: 5,
      cursor: 'c1',
    });

    expect(repo.listRuns).toHaveBeenCalledWith(
      { sortBy: 'cost', order: 'asc', status: ['failed'] },
      5,
      'c1',
    );
  });
});
