import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@server/modules/admin/admin.repository', () => ({
  adminRepository: { overviewCounts: vi.fn() },
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
