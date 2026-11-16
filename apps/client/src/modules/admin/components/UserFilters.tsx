import { UserRoundIcon } from 'lucide-react';
import type { ListUsersStatusItem } from '@/libs/api/generated/model/listUsersStatusItem';
import { UserSearchInput } from '@/modules/admin/components/UserSearchInput';
import type { UserFiltersProps, UserStatusChip } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const text = resources.admin.users;

// Guests are listed only when asked for, so their chip reads as an opt-in rather than a status.
const chips: UserStatusChip[] = [
  { status: 'registered', label: text.statuses.registered },
  { status: 'admin', label: text.statuses.admin },
  { status: 'banned', label: text.statuses.banned },
  { status: 'pendingDeletion', label: text.statuses.pendingDeletion },
  { status: 'unverified', label: text.statuses.unverified },
  { status: 'guest', label: text.showGuests, dashed: true },
];

/** The Users toolbar: a search box and one toggle per status; each choice goes to the URL through `onChange`. */
export const UserFilters = ({ search, onChange }: UserFiltersProps) => {
  const chosen = search.status ?? [];

  const toggle = (status: ListUsersStatusItem) => {
    const next = chosen.includes(status)
      ? chosen.filter((other) => other !== status)
      : [...chosen, status];
    onChange({ status: next.length > 0 ? next : undefined });
  };

  return (
    <fieldset
      aria-label={text.filters}
      className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 px-5 pt-0 pb-3"
    >
      <UserSearchInput value={search.q} onChange={(q) => onChange({ q }, true)} />
      {chips.map(({ status, label, dashed }) => {
        const active = chosen.includes(status);
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-lg border border-border-strong bg-panel px-2.5 text-[12.5px] whitespace-nowrap text-foreground-secondary hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
              active && 'bg-hover text-foreground',
              dashed && !active && 'border-dashed text-muted-foreground',
            )}
            onClick={() => toggle(status)}
          >
            {dashed && <UserRoundIcon className="size-3.5" />}
            {label}
          </button>
        );
      })}
    </fieldset>
  );
};
