import { CalendarIcon } from 'lucide-react';
import { AuditFilterChip } from '@/modules/admin/components/AuditFilterChip';
import type { AuditDateFilterProps } from '@/modules/admin/types/types';
import { formatAuditDay } from '@/modules/admin/utils/formatAuditTime';
import { FILTER_CHIP_TRIGGER } from '@/modules/admin/utils/filterChipTrigger';
import { resources } from '@/resources';
import { Input } from '@/shared/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';

const { filter: text } = resources.admin.audit;

const rangeLabel = (from?: string, to?: string) => {
  if (from && to) return `${formatAuditDay(from)} – ${formatAuditDay(to)}`;
  if (from) return text.fromDay(formatAuditDay(from));
  if (to) return text.untilDay(formatAuditDay(to));
  return text.dates;
};

/** The days an entry may fall on, chosen in a popover and shown as one range. */
export const AuditDateFilter = ({ from, to, onChange }: AuditDateFilterProps) => (
  <AuditFilterChip
    active={Boolean(from || to)}
    dashed
    clearLabel={text.clear(text.dates)}
    onClear={() => onChange({ from: undefined, to: undefined })}
  >
    <Popover>
      <PopoverTrigger className={FILTER_CHIP_TRIGGER}>
        <CalendarIcon />
        {rangeLabel(from, to)}
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto gap-3 p-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {text.from}
          <Input
            type="date"
            value={from ?? ''}
            max={to}
            onChange={(event) => onChange({ from: event.target.value || undefined })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {text.to}
          <Input
            type="date"
            value={to ?? ''}
            min={from}
            onChange={(event) => onChange({ to: event.target.value || undefined })}
          />
        </label>
      </PopoverContent>
    </Popover>
  </AuditFilterChip>
);
