import { getRouteApi } from '@tanstack/react-router';
import { AdminDataTable } from '@/modules/admin/components/AdminDataTable';
import { AdminPageTitle } from '@/modules/admin/components/AdminPageTitle';
import { UserFilters } from '@/modules/admin/components/UserFilters';
import { useCursorPaging } from '@/modules/admin/hooks/useCursorPaging';
import type { UsersSearch } from '@/modules/admin/types/types';
import { userColumns } from '@/modules/admin/utils/userColumns';
import { userQueryOptions } from '@/modules/admin/utils/userQueryOptions';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';

const route = getRouteApi('/_app/admin/users');
const text = resources.admin.users;

export const UsersPage = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  // A new search, filter or sort starts again from the first page; the open User stays open.
  const change = (patch: Partial<UsersSearch>, replace = false) =>
    void navigate({
      search: (previous) => ({ ...previous, ...patch, cursor: undefined }),
      replace,
    });

  const paging = useCursorPaging({
    cursor: search.cursor,
    onCursor: (cursor) => void navigate({ search: (previous) => ({ ...previous, cursor }) }),
    onRestart: () => change({}),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminPageTitle>{text.title}</AdminPageTitle>
      <UserFilters search={search} onChange={change} />
      <AdminDataTable
        label={text.title}
        columns={userColumns}
        search={search}
        queryOptions={userQueryOptions}
        getRowId={(user) => user.id}
        selectedId={search.selected}
        onSelect={(user) => {
          // Replaced, so Previous still goes back a page rather than to the User opened before.
          void navigate({
            search: (previous) => ({ ...previous, selected: user.id }),
            replace: true,
          });
          usePanelStore.getState().openRight();
        }}
        {...paging}
        empty={
          <>
            <p className="text-sm">{text.empty}</p>
            <p className="mt-2 text-xs text-muted-foreground">{text.emptyHint}</p>
          </>
        }
        errorMessage={text.loadFailed}
      />
    </div>
  );
};
