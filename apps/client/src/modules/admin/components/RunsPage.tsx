import { getRouteApi } from '@tanstack/react-router';
import { AdminDataTable } from '@/modules/admin/components/AdminDataTable';
import { AdminPageTitle } from '@/modules/admin/components/AdminPageTitle';
import { RunFilters } from '@/modules/admin/components/RunFilters';
import { useCursorPaging } from '@/modules/admin/hooks/useCursorPaging';
import type { RunsSearch } from '@/modules/admin/types/types';
import { runColumns } from '@/modules/admin/utils/runColumns';
import { runQueryOptions } from '@/modules/admin/utils/runQueryOptions';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';

const route = getRouteApi('/_app/admin/runs');
const text = resources.admin.runs;

export const RunsPage = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  // A new filter starts again from the first page; the open Run stays open.
  const change = (patch: Partial<RunsSearch>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch, cursor: undefined }) });

  const paging = useCursorPaging({
    cursor: search.cursor,
    onCursor: (cursor) => void navigate({ search: (previous) => ({ ...previous, cursor }) }),
    onRestart: () => change({}),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminPageTitle>{text.title}</AdminPageTitle>
      <RunFilters search={search} onChange={change} />
      <AdminDataTable
        label={text.title}
        columns={runColumns}
        search={search}
        queryOptions={runQueryOptions}
        getRowId={(run) => run.id}
        selectedId={search.selected}
        onSelect={(run) => {
          // Replaced, so Previous still goes back a page rather than to the Run opened before.
          void navigate({
            search: (previous) => ({ ...previous, selected: run.id }),
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
