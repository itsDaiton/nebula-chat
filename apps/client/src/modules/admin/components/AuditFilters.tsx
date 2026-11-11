import { XIcon } from 'lucide-react';
import { AuditEntryAction } from '@/libs/api/generated/model/auditEntryAction';
import { AuditEntryActorType } from '@/libs/api/generated/model/auditEntryActorType';
import type { AuditFiltersProps, AuditSearch } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { filter: text } = resources.admin.audit;
const control =
  'h-8 rounded-lg border border-border bg-transparent px-2.5 text-[12.5px] text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none';

/** The Audit log's filter bar; each choice goes to the URL through `onChange`. */
export const AuditFilters = ({ search, onChange }: AuditFiltersProps) => {
  const active = Object.entries(search).some(([key, value]) => key !== 'cursor' && value);

  return (
    <form
      role="search"
      aria-label={resources.admin.audit.filters}
      className="flex flex-wrap items-center gap-2 px-5 pb-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <select
        aria-label={text.actor}
        className={control}
        value={search.actor ?? ''}
        onChange={(event) =>
          onChange({ actor: (event.target.value || undefined) as AuditSearch['actor'] })
        }
      >
        <option value="">{text.anyActor}</option>
        {Object.values(AuditEntryActorType).map((actor) => (
          <option key={actor} value={actor}>
            {resources.admin.audit.actors[actor]}
          </option>
        ))}
      </select>
      <select
        aria-label={text.action}
        className={control}
        value={search.action ?? ''}
        onChange={(event) =>
          onChange({ action: (event.target.value || undefined) as AuditSearch['action'] })
        }
      >
        <option value="">{text.anyAction}</option>
        {Object.values(AuditEntryAction).map((action) => (
          <option key={action} value={action}>
            {action}
          </option>
        ))}
      </select>
      <input
        key={search.target ?? ''}
        aria-label={text.target}
        placeholder={text.targetPlaceholder}
        className={`${control} w-44 font-mono`}
        defaultValue={search.target}
        onBlur={(event) => {
          const target = event.target.value.trim() || undefined;
          if (target !== search.target) onChange({ target });
        }}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      />
      <input
        type="date"
        aria-label={text.from}
        className={control}
        value={search.from ?? ''}
        max={search.to}
        onChange={(event) => onChange({ from: event.target.value || undefined })}
      />
      <input
        type="date"
        aria-label={text.to}
        className={control}
        value={search.to ?? ''}
        min={search.from}
        onChange={(event) => onChange({ to: event.target.value || undefined })}
      />
      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              actor: undefined,
              action: undefined,
              target: undefined,
              from: undefined,
              to: undefined,
            })
          }
        >
          <XIcon />
          {resources.admin.audit.clearFilters}
        </Button>
      )}
    </form>
  );
};
