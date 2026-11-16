import { AuditFilterChip } from '@/modules/admin/components/AuditFilterChip';
import type { AuditChoiceFilterProps } from '@/modules/admin/types/types';
import { FILTER_CHIP_TRIGGER } from '@/modules/admin/utils/filterChipTrigger';
import { resources } from '@/resources';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

const { filter: text } = resources.admin.audit;
const ANY = '';

/** A filter that takes one of a few values, chosen from a menu. */
export const AuditChoiceFilter = ({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: AuditChoiceFilterProps) => {
  const chosen = options.find((option) => option.value === value);

  return (
    <AuditFilterChip
      active={chosen !== undefined}
      clearLabel={text.clear(label)}
      onClear={() => onChange(undefined)}
    >
      <DropdownMenu>
        <DropdownMenuTrigger className={FILTER_CHIP_TRIGGER}>
          <Icon />
          {`${label}: ${chosen?.label ?? text.any}`}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          <DropdownMenuRadioGroup
            value={value ?? ANY}
            onValueChange={(next) => onChange(next === ANY ? undefined : String(next))}
          >
            <DropdownMenuRadioItem value={ANY}>{text.any}</DropdownMenuRadioItem>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </AuditFilterChip>
  );
};
