import { useGetAdminLogLevels } from '@/libs/api/generated/admin/admin';
import type { LogLevelsQuery, ServiceLevels } from '@/modules/admin/types/types';
import { nextRefreshMs } from '@/modules/admin/utils/logLevels';

// A temporary change expires on its own, so the table reads again when one does.
const options = {
  query: {
    meta: { inlineError: true },
    refetchInterval: ({ state }: LogLevelsQuery) => nextRefreshMs(state.data),
  },
};

/** Both services' levels, each from its own read, so a quiet worker never holds up the server's rows. */
export const useLogLevels = () => {
  const server = useGetAdminLogLevels({ service: 'server' }, options);
  const worker = useGetAdminLogLevels({ service: 'worker' }, options);
  const queries = [server, worker];

  const services: ServiceLevels[] = [
    {
      service: 'server',
      reports: server.data,
      isPending: server.isPending,
      isError: server.isError,
    },
    {
      service: 'worker',
      reports: worker.data,
      isPending: worker.isPending,
      isError: worker.isError,
    },
  ];

  return {
    services,
    updatedAt: Math.max(server.dataUpdatedAt, worker.dataUpdatedAt),
    isFetching: queries.some((query) => query.isFetching),
    refresh: () => Promise.all(queries.map((query) => query.refetch())),
  };
};
