import type { AdminToggleChipProps } from '@/modules/admin/types/types';
import { cn } from '@/shared/utils/cn';

/** One toggle in an admin toolbar. */
export const AdminToggleChip = ({
  active,
  dashed = false,
  className,
  onClick,
  children,
}: AdminToggleChipProps) => (
  <button
    type="button"
    aria-pressed={active}
    className={cn(
      'inline-flex h-7 items-center gap-1.5 rounded-lg border border-border-strong bg-panel px-2.5 text-[12.5px] whitespace-nowrap text-foreground-secondary hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
      active && 'bg-hover text-foreground',
      dashed && !active && 'border-dashed text-muted-foreground',
      className,
    )}
    onClick={onClick}
  >
    {children}
  </button>
);
