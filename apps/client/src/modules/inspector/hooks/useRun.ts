import { useGetRun } from '@/libs/api/generated/runs/runs';

/** A Run with its Steps; the Run view and the thread's Run card share one request, and each shows its own failure. */
export const useRun = (runId: string, { audited = false } = {}) =>
  useGetRun(runId, {
    query: {
      meta: { inlineError: true },
      // An Admin's read writes an Audit entry, so each opening is a new read and none is served from cache.
      ...(audited && { staleTime: Infinity, gcTime: 0 }),
    },
  });
