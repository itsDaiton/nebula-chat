import { getRouteApi, useRouter } from '@tanstack/react-router';
import { AdminDataTable } from '@/modules/admin/components/AdminDataTable';
import { AuditDetail } from '@/modules/admin/components/AuditDetail';
import { AuditFilters } from '@/modules/admin/components/AuditFilters';
import { useAdminSelection } from '@/modules/admin/hooks/useAdminSelection';
import { auditColumns } from '@/modules/admin/utils/auditColumns';
import { auditQueryOptions } from '@/modules/admin/utils/auditQueryOptions';
import type { AuditSearch } from '@/modules/admin/types/types';
import { resources } from '@/resources';

const route = getRouteApi('/_app/admin/audit');
const text = resources.admin.audit;

export const AuditLogPage = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const router = useRouter();
  const { selectedId, select, clear } = useAdminSelection('/admin/audit');

  // A new filter starts again from the newest entry.
  const change = (patch: Partial<AuditSearch>) => {
    clear();
    void navigate({ search: (previous) => ({ ...previous, ...patch, cursor: undefined }) });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="px-5 pt-5 pb-4 text-xl font-semibold">{text.title}</h1>
      <AuditFilters search={search} onChange={change} />
      <AdminDataTable
        label={text.title}
        columns={auditColumns}
        search={search}
        queryOptions={auditQueryOptions}
        getRowId={(entry) => entry.id}
        selectedId={selectedId}
        onSelect={(entry) => select(entry.id, entry.action, <AuditDetail entry={entry} />)}
        onNext={(cursor) => {
          clear();
          void navigate({ search: (previous) => ({ ...previous, cursor }) });
        }}
        canPrevious={Boolean(search.cursor)}
        // Each page is a history entry, so going back is going to the previous page.
        onPrevious={() => {
          clear();
          router.history.back();
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
