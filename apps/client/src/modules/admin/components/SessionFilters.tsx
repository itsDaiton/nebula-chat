import { ArchiveIcon, CpuIcon } from 'lucide-react';
import { AuditChoiceFilter } from '@/modules/admin/components/AuditChoiceFilter';
import { SessionOwnerFilter } from '@/modules/admin/components/SessionOwnerFilter';
import { UserSearchInput } from '@/modules/admin/components/UserSearchInput';
import type { SessionFiltersProps, SessionsSearch } from '@/modules/admin/types/types';
import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import { resources } from '@/resources';

const text = resources.admin.sessions;

const archivedOptions = [
  { value: 'true', label: text.filter.archivedOnly },
  { value: 'false', label: text.filter.activeOnly },
];

/** The Sessions toolbar: a title search, the owner while one is chosen, and Model and archived menus. */
export const SessionFilters = ({ search, onChange }: SessionFiltersProps) => {
  const { options } = useModelCatalog();
  const modelOptions = options.map(({ value, label }) => ({ value, label }));
  // A Model retired from the catalog still filters, under its id.
  if (search.model && !modelOptions.some(({ value }) => value === search.model)) {
    modelOptions.push({ value: search.model, label: search.model });
  }

  return (
    <fieldset
      aria-label={text.filters}
      className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 px-5 pt-0 pb-3"
    >
      <UserSearchInput
        value={search.q}
        onChange={(q) => onChange({ q }, true)}
        label={text.search}
        placeholder={text.searchPlaceholder}
      />
      {search.user && (
        <SessionOwnerFilter userId={search.user} onClear={() => onChange({ user: undefined })} />
      )}
      <AuditChoiceFilter
        icon={CpuIcon}
        label={text.filter.model}
        value={search.model}
        options={modelOptions}
        onChange={(model) => onChange({ model })}
      />
      <AuditChoiceFilter
        icon={ArchiveIcon}
        label={text.filter.archived}
        value={search.archived}
        options={archivedOptions}
        onChange={(archived) => onChange({ archived: archived as SessionsSearch['archived'] })}
      />
    </fieldset>
  );
};
