import { XIcon } from 'lucide-react';
import type { AuditFilterChipProps } from '@/modules/admin/types/types';
import { cn } from '@/shared/utils/cn';

/** One filter in the toolbar: its trigger as `children`, and a × beside it while it holds a value. */
export const AuditFilterChip = ({
  children,
  active,
  dashed = false,
  clearLabel,
  onClear,
}: AuditFilterChipProps) => (
  <span
    className={cn(
      'inline-flex h-7 items-center rounded-lg border border-border-strong bg-panel text-[12.5px] whitespace-nowrap text-foreground-secondary focus-within:ring-2 focus-within:ring-ring/50',
      active && 'bg-hover text-foreground',
      dashed && !active && 'border-dashed text-muted-foreground',
    )}
  >
    {children}
    {active && onClear && (
      <button
        type="button"
        aria-label={clearLabel}
        className="mr-1 grid size-5 place-items-center rounded-md text-muted-foreground hover:bg-border hover:text-foreground focus-visible:outline-none"
        onClick={onClear}
      >
        <XIcon className="size-3.5" />
      </button>
    )}
  </span>
);
