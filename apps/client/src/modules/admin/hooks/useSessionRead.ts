import { useReadSession } from '@/libs/api/generated/admin/admin';

// Every read is audited, so one visit reads once: no refetch on focus or reconnect, and the
// cache is dropped on leaving so the next visit is a new, audited read.
export const useSessionRead = (id: string) =>
  useReadSession(id, {
    query: {
      // The right panel outlives its route for a render, when the id is already gone.
      enabled: Boolean(id),
      staleTime: Infinity,
      gcTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      meta: { inlineError: true },
    },
  });
