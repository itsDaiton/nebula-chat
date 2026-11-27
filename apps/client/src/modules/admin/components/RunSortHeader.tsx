import { getRouteApi } from '@tanstack/react-router';
import { AdminSortHeader } from '@/modules/admin/components/AdminSortHeader';
import type { RunSortHeaderProps } from '@/modules/admin/types/types';
import { DEFAULT_RUN_ORDER, DEFAULT_RUN_SORT } from '@/modules/admin/utils/runQueryOptions';
import { resources } from '@/resources';

const route = getRouteApi('/_app/admin/runs');
const text = resources.admin.runs;

export const RunSortHeader = ({ column, label, alignRight }: RunSortHeaderProps) => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const direction = search.dir ?? DEFAULT_RUN_ORDER;
  const active = (search.sort ?? DEFAULT_RUN_SORT) === column;

  return (
    <AdminSortHeader
      label={label}
      ariaLabel={text.sort(label, active ? direction : undefined)}
      active={active}
      direction={direction}
      alignRight={alignRight}
      onSort={(dir) =>
        void navigate({
          search: (previous) => ({ ...previous, sort: column, dir, cursor: undefined }),
        })
      }
    />
  );
};
