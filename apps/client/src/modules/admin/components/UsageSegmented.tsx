import type { UsageSegmentedProps } from '@/modules/admin/types/types';
import { cn } from '@/shared/utils/cn';

/** A row of mutually exclusive choices, in the look of the Overview's range switch. */
export const UsageSegmented = <T extends string>({
  label,
  value,
  options,
  onChange,
}: UsageSegmentedProps<T>) => (
  <div
    role="group"
    aria-label={label}
    className="inline-flex gap-0.5 rounded-[9px] border border-border-strong bg-raised p-0.5"
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={option.value === value}
        onClick={() => onChange(option.value)}
        className={cn(
          'h-[26px] rounded-[7px] px-2.5 text-[12.5px] text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
          option.value === value && 'bg-panel text-foreground ring-1 ring-border-strong',
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
