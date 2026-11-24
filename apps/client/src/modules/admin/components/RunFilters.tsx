import type { ListAllRunsStatusItem } from '@/libs/api/generated/model/listAllRunsStatusItem';
import { AdminToggleChip } from '@/modules/admin/components/AdminToggleChip';
import { AuditDateFilter } from '@/modules/admin/components/AuditDateFilter';
import { SessionOwnerFilter } from '@/modules/admin/components/SessionOwnerFilter';
import type { RunFiltersProps } from '@/modules/admin/types/types';
import { toggleChoice } from '@/modules/admin/utils/toggleChoice';
import { resources } from '@/resources';

const statuses = Object.keys(resources.inspector.run.status) as ListAllRunsStatusItem[];

/** The Runs toolbar: one toggle per status, the owner while one is chosen, and the dates; none chosen means all. */
export const RunFilters = ({ search, onChange }: RunFiltersProps) => {
  const chosen = search.status ?? [];

  return (
    <fieldset
      aria-label={resources.admin.runs.filters}
      className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 px-5 pt-0 pb-3"
    >
      {statuses.map((status) => (
        <AdminToggleChip
          key={status}
          active={chosen.includes(status)}
          className="font-mono"
          onClick={() => onChange({ status: toggleChoice(chosen, status) })}
        >
          {resources.inspector.run.status[status]}
        </AdminToggleChip>
      ))}
      {search.user && (
        <SessionOwnerFilter userId={search.user} onClear={() => onChange({ user: undefined })} />
      )}
      <AuditDateFilter from={search.from} to={search.to} onChange={onChange} />
    </fieldset>
  );
};
