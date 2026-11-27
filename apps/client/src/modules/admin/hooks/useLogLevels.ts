import { useGetAdminLogLevels } from '@/libs/api/generated/admin/admin';
import type { ServiceLevels } from '@/modules/admin/types/types';

const inline = { query: { meta: { inlineError: true } } };

/** Both services' levels, each from its own read, so a quiet worker never holds up the server's rows. */
export const useLogLevels = () => {
  const server = useGetAdminLogLevels({ service: 'server' }, inline);
  const worker = useGetAdminLogLevels({ service: 'worker' }, inline);
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
