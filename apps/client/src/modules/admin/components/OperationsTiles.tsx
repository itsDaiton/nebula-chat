import type { ReactNode } from 'react';
import type { OperationsTilesProps } from '@/modules/admin/types/types';
import { USER_BADGE } from '@/modules/admin/utils/userBadge';
import { resources } from '@/resources';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';

const text = resources.admin.operations;

const Tile = ({ label, children }: { label: string; children: ReactNode }) => (
  <div
    role="group"
    aria-label={label}
    className="rounded-xl border border-border bg-panel px-3.5 pt-3.5 pb-3"
  >
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1.5">{children}</div>
  </div>
);

const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);

/** Worker liveness and the waiting and failed totals across the queues. */
export const OperationsTiles = ({ operations }: OperationsTilesProps) => {
  const { worker, queues } = operations;
  const answering = worker.status === 'answering';
  const failed = total(queues.map((queue) => queue.failed));

  return (
    <div className="grid gap-3 px-5 pt-2 sm:grid-cols-3">
      <Tile label={text.tiles.worker}>
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
      </Tile>
      <Tile label={text.tiles.waiting}>
        <div className="font-mono text-[26px] font-medium tracking-[-0.03em] tabular-nums">
          {total(queues.map((queue) => queue.waiting))}
        </div>
      </Tile>
      <Tile label={text.tiles.failed}>
        <div
          className={cn(
            'font-mono text-[26px] font-medium tracking-[-0.03em] tabular-nums',
            failed > 0 && 'text-destructive',
          )}
        >
          {failed}
        </div>
      </Tile>
    </div>
  );
};
