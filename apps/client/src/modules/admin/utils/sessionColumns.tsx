import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { AdminSessionListItem } from '@/libs/api/generated/model/adminSessionListItem';
import { SessionOrderHeader } from '@/modules/admin/components/SessionOrderHeader';
import { UserLastActive } from '@/modules/admin/components/UserLastActive';
import type { AdminTableFeatures } from '@/modules/admin/types/types';
import { resources } from '@/resources';

const { columns: text, yes, no } = resources.admin.sessions;
const column = createColumnHelper<AdminTableFeatures, AdminSessionListItem>();
const mono = 'font-mono text-[11.5px]';

export const sessionColumns = column.columns([
  column.accessor('title', {
    header: text.title,
    cell: (info) => (
      <span className="block max-w-[260px] truncate text-foreground">{info.getValue()}</span>
    ),
  }),
  column.accessor('owner', {
    header: text.owner,
    cell: (info) => (
      <Link
        to="/admin/users"
        search={{ selected: info.getValue().id }}
        // The row opens the transcript; the owner's name opens the owner.
        onClick={(event) => event.stopPropagation()}
        className="rounded-sm hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {info.getValue().name}
      </Link>
    ),
  }),
  column.accessor('model', {
    header: text.model,
    cell: (info) => <span className={mono}>{info.getValue()}</span>,
  }),
  column.accessor('messageCount', {
    header: () => <span className="block text-right">{text.messages}</span>,
    cell: (info) => (
      <span className={`block text-right tabular-nums ${mono}`}>{info.getValue()}</span>
    ),
  }),
  column.accessor('updatedAt', {
    id: 'lastActivity',
    header: () => <SessionOrderHeader />,
    cell: (info) => (
      <span className={mono}>
        <UserLastActive at={info.getValue()} />
      </span>
    ),
  }),
  column.accessor('archived', {
    header: text.archived,
    cell: (info) => <span className={mono}>{info.getValue() ? yes : no}</span>,
  }),
]);
