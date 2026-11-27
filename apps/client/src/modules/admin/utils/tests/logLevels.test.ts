import { describe, expect, it } from 'vitest';
import type { LogLevelReports } from '@/libs/api/generated/model/logLevelReports';
import type { LogLevelState } from '@/libs/api/generated/model/logLevelState';
import { formatWait, logLevelRows, nextRefreshMs } from '@/modules/admin/utils/logLevels';

const NOW = Date.parse('2026-10-27T21:00:00Z');
const inMinutes = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString();

const atBoot = (target: LogLevelState['target']): LogLevelState => ({
  target,
  level: 'info',
  expiresAt: null,
  operator: null,
});

const held = (target: LogLevelState['target'], expiresAt: string): LogLevelState => ({
  target,
  level: 'debug',
  expiresAt,
  operator: 'Jana K.',
});

const reportsOf = (...instances: LogLevelState[][]): LogLevelReports => ({
  receivers: instances.length,
  reports: instances.map((levels, index) => ({ instance: `web-${index}`, levels })),
});

describe('logLevelRows', () => {
  it('keeps the root and temporary changes once each, root first', () => {
    const change = held('redis', inMinutes(5));
    const rows = logLevelRows(
      'server',
      reportsOf([atBoot('root'), atBoot('auth'), change], [atBoot('root'), change]),
    );

    expect(rows).toEqual([
      { service: 'server', ...atBoot('root') },
      { service: 'server', ...change },
    ]);
  });
});

describe('formatWait', () => {
  it.each([
    [inMinutes(11), '11m'],
    [inMinutes(0.2), '1m'],
    [inMinutes(60), '1h'],
    [inMinutes(65), '1h 5m'],
  ])('shows %s as %s', (expiresAt, expected) => {
    expect(formatWait(expiresAt, NOW)).toBe(expected);
  });
});

describe('nextRefreshMs', () => {
  it('does not refresh while every level is at boot', () => {
    expect(nextRefreshMs(reportsOf([atBoot('root'), atBoot('redis')]), NOW)).toBe(false);
    expect(nextRefreshMs(undefined, NOW)).toBe(false);
  });

  it('refreshes just after the earliest temporary change expires', () => {
    const reports = reportsOf(
      [atBoot('root'), held('redis', inMinutes(0.5))],
      [held('root', inMinutes(0.25))],
    );

    expect(nextRefreshMs(reports, NOW)).toBe(15_000 + 250);
  });

  it('refreshes at least once a minute while a change holds, so its countdown stays current', () => {
    expect(nextRefreshMs(reportsOf([held('redis', inMinutes(11))]), NOW)).toBe(60_000);
  });

  it('refreshes soon when a change is already past its expiry', () => {
    expect(nextRefreshMs(reportsOf([held('redis', inMinutes(-1))]), NOW)).toBe(250);
  });
});
