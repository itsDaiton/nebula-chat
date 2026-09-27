import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import type { CreateQueryClientOptions } from '@/libs/api/types/types';
import { notifyError } from '@/libs/api/utils/notifyError';

// The single place a failure is reported; components read `query.error` for inline states.
export const createQueryClient = ({ retry = 1 }: CreateQueryClientOptions = {}) =>
  new QueryClient({
    queryCache: new QueryCache({ onError: notifyError }),
    mutationCache: new MutationCache({ onError: notifyError }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });

export const queryClient = createQueryClient();
