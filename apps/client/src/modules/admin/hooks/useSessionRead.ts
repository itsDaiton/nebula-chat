import { useReadSession } from '@/libs/api/generated/admin/admin';

// Every read is audited, so one visit reads once: no refetch on focus or reconnect, and the
// cache is dropped on leaving so the next visit is a new, audited read.
export const useSessionRead = (id: string) =>
  useReadSession(id, {
    query: {
      staleTime: Infinity,
      gcTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      meta: { inlineError: true },
    },
  });
