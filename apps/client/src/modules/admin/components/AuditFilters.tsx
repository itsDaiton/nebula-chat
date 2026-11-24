import { FilterIcon, UserIcon } from 'lucide-react';
import { ListAuditEntriesAction } from '@/libs/api/generated/model/listAuditEntriesAction';
import { ListAuditEntriesActorType } from '@/libs/api/generated/model/listAuditEntriesActorType';
import { AuditChoiceFilter } from '@/modules/admin/components/AuditChoiceFilter';
import { AuditDateFilter } from '@/modules/admin/components/AuditDateFilter';
import { AuditTargetFilter } from '@/modules/admin/components/AuditTargetFilter';
import type { AuditFiltersProps, AuditSearch } from '@/modules/admin/types/types';
import { resources } from '@/resources';

const { filter: text, actors } = resources.admin.audit;

const actorOptions = Object.values(ListAuditEntriesActorType).map((actor) => ({
  value: actor,
  label: actors[actor],
}));
const actionOptions = Object.values(ListAuditEntriesAction).map((action) => ({
  value: action,
  label: action,
}));

/** The Audit log's filter chips; each choice goes to the URL through `onChange`. */
export const AuditFilters = ({ search, onChange }: AuditFiltersProps) => (
  <fieldset
    aria-label={resources.admin.audit.filters}
    className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 px-5 pt-0 pb-3"
  >
    <AuditChoiceFilter
      icon={UserIcon}
      label={text.actor}
      value={search.actor}
      options={actorOptions}
      onChange={(actor) => onChange({ actor: actor as AuditSearch['actor'] })}
    />
    <AuditChoiceFilter
      icon={FilterIcon}
      label={text.action}
      value={search.action}
      options={actionOptions}
      onChange={(action) => onChange({ action: action as AuditSearch['action'] })}
    />
    <AuditTargetFilter value={search.target} onChange={(target) => onChange({ target })} />
    <AuditDateFilter from={search.from} to={search.to} onChange={onChange} />
  </fieldset>
);
