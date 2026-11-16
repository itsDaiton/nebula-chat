import { ServerIcon, TerminalIcon, UserIcon } from 'lucide-react';
import { resources } from '@/resources';
import type { AuditActorCellProps } from '@/modules/admin/types/types';
import { cn } from '@/shared/utils/cn';

const pill =
  'inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[11px]';

/** Who acted: an Admin by id, the Operator and the system as distinct outlined pills. */
export const AuditActorCell = ({ entry }: AuditActorCellProps) => {
  const { actors } = resources.admin.audit;

  if (entry.actorType === 'operator') {
    return (
      <span className={cn(pill, 'border-dashed border-border-strong text-muted-foreground')}>
        <TerminalIcon className="size-3" />
        {actors.operator}
      </span>
    );
  }

  if (entry.actorType === 'system') {
    return (
      <span className={cn(pill, 'border-border-strong text-muted-foreground')}>
        <ServerIcon className="size-3" />
        {actors.system}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid size-5 place-items-center rounded-full bg-raised text-muted-foreground">
        <UserIcon className="size-3" />
      </span>
      <span className="font-mono text-[11.5px]" title={entry.actorUserId ?? undefined}>
        {entry.actorUserId?.slice(0, 8) ?? actors.admin}
      </span>
    </span>
  );
};
