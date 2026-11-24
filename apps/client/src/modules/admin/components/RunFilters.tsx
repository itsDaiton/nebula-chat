import type { ListAllRunsStatusItem } from '@/libs/api/generated/model/listAllRunsStatusItem';
import { AuditDateFilter } from '@/modules/admin/components/AuditDateFilter';
import { SessionOwnerFilter } from '@/modules/admin/components/SessionOwnerFilter';
import type { RunFiltersProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const statuses = Object.keys(resources.inspector.run.status) as ListAllRunsStatusItem[];

/** The Runs toolbar: one toggle per status, the owner while one is chosen, and the dates; none chosen means all. */
export const RunFilters = ({ search, onChange }: RunFiltersProps) => {
  const chosen = search.status ?? [];

  const toggle = (status: ListAllRunsStatusItem) => {
    const next = chosen.includes(status)
      ? chosen.filter((other) => other !== status)
      : [...chosen, status];
    onChange({ status: next.length > 0 ? next : undefined });
  };

  return (
    <fieldset
      aria-label={resources.admin.runs.filters}
      className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 px-5 pt-0 pb-3"
    >
      {statuses.map((status) => {
        const active = chosen.includes(status);
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            className={cn(
              'inline-flex h-7 items-center rounded-lg border border-border-strong bg-panel px-2.5 font-mono text-[12.5px] whitespace-nowrap text-foreground-secondary hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
              active && 'bg-hover text-foreground',
            )}
            onClick={() => toggle(status)}
          >
            {resources.inspector.run.status[status]}
          </button>
        );
      })}
      {search.user && (
        <SessionOwnerFilter userId={search.user} onClear={() => onChange({ user: undefined })} />
      )}
      <AuditDateFilter from={search.from} to={search.to} onChange={onChange} />
    </fieldset>
  );
};
