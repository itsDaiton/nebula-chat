import type { RunStatus } from '@/libs/api/generated/model/runStatus';
import type { RunStatusBadgeProps } from '@/modules/inspector/types/types';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

// Status colours only for status: an ended Run takes one, a Run still going stays neutral.
const tone: Partial<Record<RunStatus, string>> = {
  completed: 'border-success/40 bg-success/8 text-success',
  partial: 'border-warning/40 bg-warning/8 text-warning',
  failed: 'border-destructive/40 bg-destructive/8 text-destructive',
  cancelled: 'border-dashed text-faint line-through',
};

export const RunStatusBadge = ({ status, withDot = false, className }: RunStatusBadgeProps) => (
  <span
    className={cn(
      'inline-flex h-[19px] shrink-0 items-center gap-1 rounded-md border border-border-strong px-1.5 font-mono text-[10.5px] font-medium whitespace-nowrap text-muted-foreground',
      tone[status],
      className,
    )}
  >
    {withDot && <span className="size-1.5 rounded-full bg-current" />}
    {resources.inspector.run.status[status]}
  </span>
);
