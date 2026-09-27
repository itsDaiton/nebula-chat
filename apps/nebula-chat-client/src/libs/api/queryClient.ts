import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import type { CreateQueryClientOptions } from '@/libs/api/types/types';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';

// The one place a server-state failure is reported (ADR-0012). The axios
// interceptor makes every error an AppError, so its message is safe to show;
// components still read `query.error` for their own inline states.
const notifyError = (error: Error) => {
  toaster.create({
    type: 'error',
    title: resources.errors.title,
    description: error.message,
  });
};

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
