import { describe, expect, it } from 'vitest';
import { formatDuration, runDurationMs } from '@/modules/inspector/utils/formatDuration';

describe('formatDuration', () => {
  it('shows tenths of a second under a minute', () => {
    expect(formatDuration(800)).toBe('0.8s');
    expect(formatDuration(41_200)).toBe('41.2s');
  });

  it('shows minutes and whole seconds from a minute up', () => {
    expect(formatDuration(60_000)).toBe('1m 0s');
    expect(formatDuration(133_400)).toBe('2m 13s');
  });
});

describe('runDurationMs', () => {
  it('measures from start to finish', () => {
    expect(
      runDurationMs({
        startedAt: '2026-10-27T21:14:00.000Z',
        finishedAt: '2026-10-27T21:14:41.200Z',
      }),
    ).toBe(41_200);
  });

  it('is unknown while either end is missing', () => {
    expect(runDurationMs({ startedAt: '2026-10-27T21:14:00.000Z', finishedAt: null })).toBeNull();
    expect(runDurationMs({ startedAt: null, finishedAt: '2026-10-27T21:14:41.200Z' })).toBeNull();
  });
});
