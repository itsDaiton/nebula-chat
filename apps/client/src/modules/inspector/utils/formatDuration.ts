import type { Timed } from '@/modules/inspector/types/types';

/** "0.8s" under a minute, "2m 13s" from there. */
export const formatDuration = (ms: number) => {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

/** How long a Run or Step took; null until it has both started and finished. */
export const runDurationMs = ({ startedAt, finishedAt }: Timed) =>
  startedAt && finishedAt ? Date.parse(finishedAt) - Date.parse(startedAt) : null;
