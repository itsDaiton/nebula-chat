import { OperationsTile } from '@/modules/admin/components/OperationsTile';
import type { OperationsTilesProps } from '@/modules/admin/types/types';
import { USER_BADGE } from '@/modules/admin/utils/userBadge';
import { resources } from '@/resources';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';

const text = resources.admin.operations;

const figure = 'font-mono text-[26px] font-medium tracking-[-0.03em] tabular-nums';

const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);

/** Worker liveness and the waiting and failed totals across the queues. */
export const OperationsTiles = ({ operations }: OperationsTilesProps) => {
  const { worker, queues } = operations;
  const answering = worker.status === 'answering';
  const failed = total(queues.map((queue) => queue.failed));

  return (
    <div className="grid gap-3 px-5 pt-2 sm:grid-cols-3">
      <OperationsTile label={text.tiles.worker}>
        <div className="flex h-[39px] items-center gap-2 font-mono text-[12.5px]">
          {/* Not answering is a state (asleep or down), not an error: neutral, never red. */}
          <Badge
            variant="outline"
            className={cn(
              USER_BADGE,
              'gap-1',
              answering && 'border-success/40 bg-success/8 text-success',
            )}
          >
            <span
              aria-hidden
              className={cn('size-1.5 rounded-full', answering ? 'bg-success' : 'bg-faint')}
            />
            {answering ? text.worker.answering : text.worker.notAnswering}
          </Badge>
          <span className="text-muted-foreground">{text.worker.instances(worker.instances)}</span>
        </div>
      </OperationsTile>
      <OperationsTile label={text.tiles.waiting}>
        <div className={figure}>{total(queues.map((queue) => queue.waiting))}</div>
      </OperationsTile>
      <OperationsTile label={text.tiles.failed}>
        <div className={cn(figure, failed > 0 && 'text-destructive')}>{failed}</div>
      </OperationsTile>
    </div>
  );
};
