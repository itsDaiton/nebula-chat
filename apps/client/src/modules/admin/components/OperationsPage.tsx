import { RefreshCwIcon } from 'lucide-react';
import { AdminPageTitle } from '@/modules/admin/components/AdminPageTitle';
import { FailedJobsTable } from '@/modules/admin/components/FailedJobsTable';
import { LogLevelsTable } from '@/modules/admin/components/LogLevelsTable';
import { OperationsTiles } from '@/modules/admin/components/OperationsTiles';
import { QueuesTable } from '@/modules/admin/components/QueuesTable';
import { useLogLevels } from '@/modules/admin/hooks/useLogLevels';
import { useOperations } from '@/modules/admin/hooks/useOperations';
import { formatClock } from '@/modules/admin/utils/logLevels';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';

const text = resources.admin.operations;

export const OperationsPage = () => {
  const levels = useLogLevels();
  const operations = useOperations();
  const updatedAt = Math.max(levels.updatedAt, operations.dataUpdatedAt);
  // A failed Refresh hides the last readout rather than showing stale counts under the error.
  const data = operations.isError ? undefined : operations.data;
  const refresh = () => Promise.all([levels.refresh(), operations.refetch()]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex items-center gap-3 pr-5">
        <div className="grow">
          <AdminPageTitle>{text.title}</AdminPageTitle>
        </div>
        {updatedAt > 0 && (
          <span className="font-mono text-[11.5px] text-faint">
            {text.updated(formatClock(updatedAt))}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          loading={levels.isFetching || operations.isFetching}
          onClick={() => void refresh()}
        >
          <RefreshCwIcon />
          {text.refresh}
        </Button>
      </div>
      {operations.isPending && (
        <output aria-label={text.loading} className="grid gap-3 px-5 pt-2 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[88px] rounded-xl" />
          ))}
        </output>
      )}
      {operations.isError && (
        <p className="px-5 pt-2 text-sm text-muted-foreground">{text.unavailable}</p>
      )}
      {data && <OperationsTiles operations={data} />}
      <LogLevelsTable services={levels.services} />
      {data && (
        <>
          <QueuesTable queues={data.queues} />
          <FailedJobsTable jobs={data.failedJobs} />
        </>
      )}
    </div>
  );
};
