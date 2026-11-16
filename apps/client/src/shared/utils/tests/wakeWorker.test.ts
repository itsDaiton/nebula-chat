import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ WORKER_URL: 'https://worker.example.com' }));
vi.mock('@/shared/config/serverConfig', () => ({ SERVER_CONFIG: config }));

import { wakeWorker } from '@/shared/utils/wakeWorker';

const fetchMock = vi.fn<typeof fetch>();
const HOUR_MS = 60 * 60_000;
let now = Date.UTC(2026, 10, 16);

beforeEach(() => {
  // The throttle is module state, so every test starts an hour past the last ping.
  now += HOUR_MS;
  vi.useFakeTimers({ now });
  config.WORKER_URL = 'https://worker.example.com';
  fetchMock.mockReset().mockResolvedValue(new Response(null));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('wakeWorker', () => {
  it("sends a one-way request to the worker's /health", () => {
    wakeWorker();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://worker.example.com/health', {
      mode: 'no-cors',
      cache: 'no-store',
    });
  });

  it('does nothing without a worker URL', () => {
    config.WORKER_URL = '';

    wakeWorker();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pings again only after a few minutes, since each ping resets the worker idle timer', () => {
    wakeWorker();
    vi.advanceTimersByTime(60_000);
    wakeWorker();
    expect(fetchMock).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(5 * 60_000);
    wakeWorker();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never throws when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(() => wakeWorker()).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);
  });
});
