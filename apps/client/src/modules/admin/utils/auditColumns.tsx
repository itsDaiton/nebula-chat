import { createColumnHelper } from '@tanstack/react-table';
import { ArrowDownIcon } from 'lucide-react';
import type { AuditEntry } from '@/libs/api/generated/model/auditEntry';
import { AuditActorCell } from '@/modules/admin/components/AuditActorCell';
import type { AdminTableFeatures } from '@/modules/admin/types/types';
import { formatAuditTime } from '@/modules/admin/utils/formatAuditTime';
import { resources } from '@/resources';

const { columns: text } = resources.admin.audit;
const column = createColumnHelper<AdminTableFeatures, AuditEntry>();

export const auditColumns = column.columns([
  column.accessor('createdAt', {
    id: 'time',
    // The API returns newest first and takes no sort, so the indicator states the order rather than offering one.
    header: () => (
      <span className="inline-flex items-center gap-1">
        {text.time}
        <ArrowDownIcon className="size-3" />
      </span>
    ),
    cell: (info) => (
      <span className="font-mono text-[11.5px]">{formatAuditTime(info.getValue())}</span>
    ),
  }),
  column.display({
    id: 'actor',
    header: text.actor,
    cell: ({ row }) => <AuditActorCell entry={row.original} />,
  }),
  column.accessor('action', {
    header: text.action,
    cell: (info) => <span className="font-mono text-[11.5px]">{info.getValue()}</span>,
  }),
  column.display({
    id: 'target',
    header: text.target,
    cell: ({ row }) => (
      <span>
        <span className="text-muted-foreground">{row.original.targetType} </span>
        <span className="font-mono text-[11.5px]">{row.original.targetId}</span>
      </span>
    ),
  }),
]);
