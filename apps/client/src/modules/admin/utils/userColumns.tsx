import { createColumnHelper } from '@tanstack/react-table';
import type { AdminUserSummary } from '@/libs/api/generated/model/adminUserSummary';
import { UserLastActive } from '@/modules/admin/components/UserLastActive';
import { UserSortHeader } from '@/modules/admin/components/UserSortHeader';
import { UserStatusBadge } from '@/modules/admin/components/UserStatusBadge';
import type { AdminTableFeatures } from '@/modules/admin/types/types';
import { formatUserDay } from '@/modules/admin/utils/formatUserDate';
import { resources } from '@/resources';

const { columns: text } = resources.admin.users;
const column = createColumnHelper<AdminTableFeatures, AdminUserSummary>();
const mono = 'font-mono text-[11.5px]';
const count = `block text-right tabular-nums ${mono}`;

export const userColumns = column.columns([
  column.accessor('name', {
    header: text.name,
    cell: (info) => <span className="text-foreground">{info.getValue()}</span>,
  }),
  column.accessor('email', {
    header: text.email,
    cell: (info) => <span className={mono}>{info.getValue()}</span>,
  }),
  column.accessor('status', {
    header: text.status,
    cell: (info) => <UserStatusBadge status={info.getValue()} />,
  }),
  column.accessor('createdAt', {
    header: () => <UserSortHeader column="createdAt" label={text.created} />,
    cell: (info) => <span className={mono}>{formatUserDay(info.getValue())}</span>,
  }),
  column.accessor('updatedAt', {
    id: 'lastActive',
    header: () => <UserSortHeader column="lastActiveAt" label={text.lastActive} />,
    cell: (info) => (
      <span className={mono}>
        <UserLastActive at={info.getValue()} />
      </span>
    ),
  }),
  column.accessor('sessionsCount', {
    // The API has no order by Sessions, so this column is a plain label.
    header: () => <span className="block text-right">{text.sessions}</span>,
    cell: (info) => <span className={count}>{info.getValue()}</span>,
  }),
  column.accessor('messagesSent', {
    header: () => <UserSortHeader column="messagesSent" label={text.messages} alignRight />,
    cell: (info) => <span className={count}>{info.getValue()}</span>,
  }),
]);
