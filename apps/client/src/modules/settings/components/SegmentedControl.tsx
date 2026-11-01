import type { SegmentedControlProps } from '@/modules/settings/types/types';
import { cn } from '@/shared/utils/cn';

/** A short list of exclusive choices; the one chosen applies at once. */
export const SegmentedControl = <Value extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<Value>) => (
  <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-border p-0.5">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={value === option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          'rounded-md px-3 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          value === option.value ? 'bg-muted font-medium' : 'text-muted-foreground',
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
