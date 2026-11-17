import { FilterIcon } from 'lucide-react';
import type { UsageModelFilterProps } from '@/modules/admin/types/types';
import { FILTER_CHIP_TRIGGER } from '@/modules/admin/utils/filterChipTrigger';
import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import { resources } from '@/resources';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

const text = resources.admin.usage;

/** Narrows the page to some Models, and to the Run series in Prompts. */
export const UsageModelFilter = ({ selected, hasRun, onChange }: UsageModelFilterProps) => {
  const { options } = useModelCatalog();
  const choices = [
    ...(hasRun ? [{ value: 'run', label: text.run }] : []),
    ...options.map(({ value, label }) => ({ value, label })),
  ];
  // A Model retired from the catalog still filters, under its id.
  for (const id of selected ?? []) {
    if (!choices.some(({ value }) => value === id)) choices.push({ value: id, label: id });
  }

  const toggle = (value: string, checked: boolean) => {
    const next = checked
      ? [...(selected ?? []), value]
      : (selected ?? []).filter((id) => id !== value);
    onChange(next.length > 0 ? next : undefined);
  };

  return (
    <span className="inline-flex h-8 items-center rounded-lg border border-border-strong bg-panel text-[13px] focus-within:ring-2 focus-within:ring-ring/50">
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={text.modelFilter} className={FILTER_CHIP_TRIGGER}>
          <FilterIcon />
          {selected ? text.modelsSelected(selected.length) : text.allModels}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 min-w-52 overflow-y-auto">
          <DropdownMenuItem disabled={!selected} onClick={() => onChange(undefined)}>
            {text.clearModels}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {choices.map((choice) => (
            <DropdownMenuCheckboxItem
              key={choice.value}
              checked={selected?.includes(choice.value) ?? false}
              closeOnClick={false}
              onCheckedChange={(checked) => toggle(choice.value, checked)}
            >
              {choice.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
};
