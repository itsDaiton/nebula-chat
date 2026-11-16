import { SERVER_CONFIG } from '@/shared/config/serverConfig';

// The free-plan worker sleeps after 15 idle minutes; pinging sooner only resets that timer.
const WAKE_INTERVAL_MS = 5 * 60_000;

let lastWakeAt = Number.NEGATIVE_INFINITY;

// A browser gets past the edge's bot challenge that blocks the server's own ping (ADR-0013).
export const wakeWorker = (): void => {
  const { WORKER_URL } = SERVER_CONFIG;
  const now = Date.now();
  if (!WORKER_URL || now - lastWakeAt < WAKE_INTERVAL_MS) return;
  lastWakeAt = now;
  void fetch(`${WORKER_URL}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => undefined);
};
