import { UserRoundIcon } from 'lucide-react';
import { AdminToggleChip } from '@/modules/admin/components/AdminToggleChip';
import { UserSearchInput } from '@/modules/admin/components/UserSearchInput';
import type { UserFiltersProps, UserStatusChip } from '@/modules/admin/types/types';
import { toggleChoice } from '@/modules/admin/utils/toggleChoice';
import { resources } from '@/resources';

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

  return (
    <fieldset
      aria-label={text.filters}
      className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 px-5 pt-0 pb-3"
    >
      <UserSearchInput value={search.q} onChange={(q) => onChange({ q }, true)} />
      {chips.map(({ status, label, dashed }) => (
        <AdminToggleChip
          key={status}
          active={chosen.includes(status)}
          dashed={dashed}
          onClick={() => onChange({ status: toggleChoice(chosen, status) })}
        >
          {dashed && <UserRoundIcon className="size-3.5" />}
          {label}
        </AdminToggleChip>
      ))}
    </fieldset>
  );
};
