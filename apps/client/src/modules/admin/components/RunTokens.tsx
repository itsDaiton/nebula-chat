import type { RunTokensProps } from '@/modules/admin/types/types';
import { formatCount } from '@/modules/admin/utils/usageFormat';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const NEAR_BUDGET = 0.8;

/** Tokens a Run used, with a bar against its Run budget that turns amber near the limit. */
export const RunTokens = ({ used, budget }: RunTokensProps) => {
  const share = budget ? Math.min(used / budget, 1) : 0;

  return (
    <span className="flex items-center justify-end gap-2 tabular-nums">
      {formatCount(used)}
      <span
        role="img"
        aria-label={budget ? resources.admin.runs.budgetUsed(used, budget) : undefined}
        aria-hidden={budget ? undefined : true}
        className="h-1 w-10 overflow-hidden rounded-full bg-hover"
      >
        <span
          className={cn(
            'block h-full rounded-full bg-foreground',
            share >= NEAR_BUDGET && 'bg-warning',
          )}
          style={{ width: `${share * 100}%` }}
        />
      </span>
    </span>
  );
};
