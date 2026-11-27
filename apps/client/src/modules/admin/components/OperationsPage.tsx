import { RefreshCwIcon } from 'lucide-react';
import { AdminPageTitle } from '@/modules/admin/components/AdminPageTitle';
import { LogLevelsTable } from '@/modules/admin/components/LogLevelsTable';
import { useLogLevels } from '@/modules/admin/hooks/useLogLevels';
import { formatClock } from '@/modules/admin/utils/logLevels';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const text = resources.admin.operations;

// #903 adds the worker tiles under the title and the Queues and failed-jobs sections under Log levels.
export const OperationsPage = () => {
  const { services, updatedAt, isFetching, refresh } = useLogLevels();

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
        <Button variant="outline" size="sm" loading={isFetching} onClick={() => void refresh()}>
          <RefreshCwIcon />
          {text.refresh}
        </Button>
      </div>
      <LogLevelsTable services={services} />
    </div>
  );
};
