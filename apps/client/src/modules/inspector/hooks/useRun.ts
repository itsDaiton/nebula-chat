import { useGetRun } from '@/libs/api/generated/runs/runs';

/** A Run with its Steps; the Run tab and the Run chip share one request, and each shows its own failure. */
export const useRun = (runId: string) =>
  useGetRun(runId, { query: { meta: { inlineError: true } } });
