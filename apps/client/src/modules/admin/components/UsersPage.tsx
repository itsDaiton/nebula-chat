import { getRouteApi, useRouter } from '@tanstack/react-router';
import { AdminDataTable } from '@/modules/admin/components/AdminDataTable';
import { UserFilters } from '@/modules/admin/components/UserFilters';
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
  const router = useRouter();

  // A new search, filter or sort starts again from the first page; the open User stays open.
  const change = (patch: Partial<UsersSearch>, replace = false) =>
    void navigate({
      search: (previous) => ({ ...previous, ...patch, cursor: undefined }),
      replace,
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="px-5 pt-4 pb-3 text-lg font-semibold tracking-tight">{text.title}</h1>
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
        onNext={(cursor) => void navigate({ search: (previous) => ({ ...previous, cursor }) })}
        canPrevious={Boolean(search.cursor)}
        // Each page is a history entry, so going back is the previous page; a pasted link has none, so it starts over.
        onPrevious={() => {
          if (router.history.canGoBack()) router.history.back();
          else change({});
        }}
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
