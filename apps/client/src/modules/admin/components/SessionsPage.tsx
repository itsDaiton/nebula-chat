import { getRouteApi, useRouter } from '@tanstack/react-router';
import { AdminDataTable } from '@/modules/admin/components/AdminDataTable';
import { AdminPageTitle } from '@/modules/admin/components/AdminPageTitle';
import { SessionFilters } from '@/modules/admin/components/SessionFilters';
import type { SessionsSearch } from '@/modules/admin/types/types';
import { sessionColumns } from '@/modules/admin/utils/sessionColumns';
import { sessionQueryOptions } from '@/modules/admin/utils/sessionQueryOptions';
import { resources } from '@/resources';

const route = getRouteApi('/_app/admin/sessions');
const text = resources.admin.sessions;

export const SessionsPage = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const router = useRouter();

  // A new search or filter starts again from the first page.
  const change = (patch: Partial<SessionsSearch>, replace = false) =>
    void navigate({
      search: (previous) => ({ ...previous, ...patch, cursor: undefined }),
      replace,
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminPageTitle>{text.title}</AdminPageTitle>
      <SessionFilters search={search} onChange={change} />
      <AdminDataTable
        label={text.title}
        columns={sessionColumns}
        search={search}
        queryOptions={sessionQueryOptions}
        getRowId={(session) => session.id}
        // The transcript carries the table's search, so going back lands on the same page of the same filters.
        onSelect={(session) =>
          void navigate({
            to: '/admin/sessions/$sessionId',
            params: { sessionId: session.id },
            search: (previous) => previous,
          })
        }
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
