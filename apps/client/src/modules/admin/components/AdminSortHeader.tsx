import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import type { AdminSortHeaderProps } from '@/modules/admin/types/types';
import { cn } from '@/shared/utils/cn';

/** A column the API can order by: a click sorts by it, largest first, and a second click reverses it. */
export const AdminSortHeader = ({
  label,
  ariaLabel,
  active,
  direction,
  alignRight = false,
  onSort,
}: AdminSortHeaderProps) => {
  const Icon = direction === 'asc' ? ChevronUpIcon : ChevronDownIcon;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        'flex w-full items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        alignRight && 'justify-end',
        active && 'text-foreground-secondary',
      )}
      onClick={() => onSort(active && direction === 'desc' ? 'asc' : 'desc')}
    >
      {label}
      {active && <Icon className="size-3" />}
    </button>
  );
};
