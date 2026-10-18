import { describe, expect, it, vi } from 'vitest';
import { createShutdown } from '@backend/shutdown';
import { captureLogger, eventLines, LEVEL } from '@backend/test/logCapture';

const setup = (close: () => Promise<void>) => {
  const { logger, lines } = captureLogger();
  const exit = vi.fn<(code: number) => void>();
  const shutdown = createShutdown({ logger, close, exit });
  return { shutdown, exit, lines };
};

describe('createShutdown', () => {
  it('exits 0 as soon as close resolves, without waiting for the event loop to drain', async () => {
    const { shutdown, exit } = setup(() => Promise.resolve());

    shutdown();

    await vi.waitFor(() => expect(exit).toHaveBeenCalledExactlyOnceWith(0));
  });

  it('logs server.shutdown.failed and exits 1 when close rejects', async () => {
    const { shutdown, exit, lines } = setup(() => Promise.reject(new Error('pool exploded')));

    shutdown();

    await vi.waitFor(() => expect(exit).toHaveBeenCalledExactlyOnceWith(1));
    expect(eventLines(lines, 'server.shutdown.failed')).toEqual([
      expect.objectContaining({
        level: LEVEL.error,
        err: expect.objectContaining({ message: 'pool exploded' }),
      }),
    ]);
  });

  it('closes once when a second signal arrives mid-shutdown', async () => {
    const close = vi.fn(() => Promise.resolve());
    const { shutdown, exit } = setup(close);

    shutdown();
    shutdown();

    await vi.waitFor(() => expect(exit).toHaveBeenCalled());
    expect(close).toHaveBeenCalledOnce();
  });
});
