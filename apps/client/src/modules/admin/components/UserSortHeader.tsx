import { getRouteApi } from '@tanstack/react-router';
import { AdminSortHeader } from '@/modules/admin/components/AdminSortHeader';
import type { UserSortHeaderProps } from '@/modules/admin/types/types';
import { DEFAULT_USER_ORDER, DEFAULT_USER_SORT } from '@/modules/admin/utils/userQueryOptions';
import { resources } from '@/resources';

const route = getRouteApi('/_app/admin/users');
const text = resources.admin.users;

export const UserSortHeader = ({ column, label, alignRight }: UserSortHeaderProps) => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const direction = search.dir ?? DEFAULT_USER_ORDER;
  const active = (search.sort ?? DEFAULT_USER_SORT) === column;

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
