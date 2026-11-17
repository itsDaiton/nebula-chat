import { GetAdminOverviewRange } from '@/libs/api/generated/model/getAdminOverviewRange';
import type { OverviewRangeSwitchProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

export const OverviewRangeSwitch = ({ value, onChange }: OverviewRangeSwitchProps) => (
  <div
    role="group"
    aria-label={resources.admin.overview.rangeLabel}
    className="inline-flex gap-0.5 rounded-[9px] border border-border-strong bg-raised p-0.5"
  >
    {Object.values(GetAdminOverviewRange).map((range) => (
      <button
        key={range}
        type="button"
        aria-pressed={range === value}
        onClick={() => onChange(range)}
        className={cn(
          'h-[26px] rounded-[7px] px-2.5 text-[12.5px] text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
          range === value && 'bg-panel text-foreground ring-1 ring-border-strong',
        )}
      >
        {range}
      </button>
    ))}
  </div>
);
