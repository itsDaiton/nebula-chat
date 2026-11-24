import { getRouteApi } from '@tanstack/react-router';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import type { RunSortHeaderProps } from '@/modules/admin/types/types';
import { DEFAULT_RUN_ORDER, DEFAULT_RUN_SORT } from '@/modules/admin/utils/runQueryOptions';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const route = getRouteApi('/_app/admin/runs');
const text = resources.admin.runs;

/** A column the API can order by: a click sorts by it, largest first, and a second click reverses it. */
export const RunSortHeader = ({ column, label, alignRight = false }: RunSortHeaderProps) => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const direction = search.dir ?? DEFAULT_RUN_ORDER;
  const active = (search.sort ?? DEFAULT_RUN_SORT) === column;
  const Icon = direction === 'asc' ? ChevronUpIcon : ChevronDownIcon;

  return (
    <button
      type="button"
      aria-label={text.sort(label, active ? direction : undefined)}
      className={cn(
        'flex w-full items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        alignRight && 'justify-end',
        active && 'text-foreground-secondary',
      )}
      onClick={() =>
        void navigate({
          search: (previous) => ({
            ...previous,
            sort: column,
            dir: active && direction === 'desc' ? 'asc' : 'desc',
            cursor: undefined,
          }),
        })
      }
    >
      {label}
      {active && <Icon className="size-3" />}
    </button>
  );
};
