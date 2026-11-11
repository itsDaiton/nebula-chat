import { FilterIcon } from 'lucide-react';
import type { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { useRef } from 'react';
import { AuditFilterChip } from '@/modules/admin/components/AuditFilterChip';
import type { AuditTargetFilterProps } from '@/modules/admin/types/types';
import { FILTER_CHIP_TRIGGER } from '@/modules/admin/utils/filterChipTrigger';
import { resources } from '@/resources';
import { Input } from '@/shared/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';

const { filter: text } = resources.admin.audit;

/** The record an entry is about, typed into a popover and applied on Enter. */
export const AuditTargetFilter = ({ value, onChange }: AuditTargetFilterProps) => {
  const popover = useRef<PopoverPrimitive.Root.Actions>(null);

  return (
    <AuditFilterChip
      active={value !== undefined}
      dashed
      clearLabel={text.clear(text.target)}
      onClear={() => onChange(undefined)}
    >
      <Popover actionsRef={popover}>
        <PopoverTrigger className={FILTER_CHIP_TRIGGER}>
          <FilterIcon />
          {value === undefined ? text.target : `${text.target}: ${value}`}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const entered = new FormData(event.currentTarget).get('target');
              const target = typeof entered === 'string' ? entered.trim() : '';
              onChange(target || undefined);
              popover.current?.close();
            }}
          >
            <Input
              name="target"
              aria-label={text.target}
              placeholder={text.targetPlaceholder}
              defaultValue={value}
              className="font-mono"
              autoFocus
            />
          </form>
        </PopoverContent>
      </Popover>
    </AuditFilterChip>
  );
};
