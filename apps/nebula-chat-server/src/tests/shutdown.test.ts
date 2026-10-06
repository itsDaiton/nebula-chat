import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShutdown } from '@backend/shutdown';
import { captureLogger, eventLines, LEVEL } from '@backend/test/logCapture';

const TIMEOUT_MS = 1_000;

const setup = (close: () => Promise<void>) => {
  const { logger, lines } = captureLogger();
  const exit = vi.fn<(code: number) => void>();
  const shutdown = createShutdown({ logger, close, timeoutMs: TIMEOUT_MS, exit });
  return { shutdown, exit, lines };
};

describe('createShutdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exits 0 as soon as close resolves, without waiting out the timeout', async () => {
    const { shutdown, exit } = setup(() => Promise.resolve());

    shutdown();
    await vi.advanceTimersByTimeAsync(0);

    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('logs server.shutdown.failed and exits 1 when close rejects', async () => {
    const { shutdown, exit, lines } = setup(() => Promise.reject(new Error('pool exploded')));

    shutdown();
    await vi.advanceTimersByTimeAsync(0);

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(eventLines(lines, 'server.shutdown.failed')).toEqual([
      expect.objectContaining({
        level: LEVEL.error,
        err: expect.objectContaining({ message: 'pool exploded' }),
      }),
    ]);
  });

  it('logs server.shutdown.timed_out and exits 1 when close outlives the timeout', async () => {
    const { shutdown, exit, lines } = setup(() => new Promise<void>(() => undefined));

    shutdown();
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
    expect(exit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(eventLines(lines, 'server.shutdown.timed_out')).toEqual([
      expect.objectContaining({ level: LEVEL.error }),
    ]);
  });

  it('closes once when a second signal arrives mid-shutdown', async () => {
    const close = vi.fn(() => Promise.resolve());
    const { shutdown } = setup(close);

    shutdown();
    shutdown();
    await vi.advanceTimersByTimeAsync(0);

    expect(close).toHaveBeenCalledOnce();
  });
});
