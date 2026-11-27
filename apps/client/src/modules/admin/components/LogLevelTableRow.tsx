import { LogLevelRevertButton } from '@/modules/admin/components/LogLevelRevertButton';
import type { LogLevelTableRowProps } from '@/modules/admin/types/types';
import { formatWait } from '@/modules/admin/utils/logLevels';
import { USER_BADGE } from '@/modules/admin/utils/userBadge';
import { resources } from '@/resources';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';

const text = resources.admin.operations;

export const LogLevelTableRow = ({ row, selected }: LogLevelTableRowProps) => {
  const temporary = row.expiresAt !== null;

  return (
    <tr
      aria-selected={selected}
      className={cn(
        'border-b border-border',
        selected && 'bg-hover shadow-[inset_2px_0_0_var(--foreground)]',
      )}
    >
      <td className="px-4 py-3">{text.services[row.service]}</td>
      <td className="px-4 py-3 font-mono">{row.target}</td>
      <td className="px-4 py-3">
        {/* Amber marks a temporary level: status colour only. */}
        <Badge
          variant="outline"
          className={cn(USER_BADGE, temporary && 'border-warning/40 bg-warning/8 text-warning')}
        >
          {row.level}
        </Badge>
      </td>
      <td className="px-4 py-3 font-mono">
        {row.expiresAt === null ? (
          <span className="text-faint">{text.logLevels.bootLevel}</span>
        ) : (
          text.logLevels.revertsIn(formatWait(row.expiresAt))
        )}
      </td>
      <td className="px-4 py-3">{row.operator ?? <span className="text-faint">—</span>}</td>
      <td className="px-4 py-2 text-right">{temporary && <LogLevelRevertButton row={row} />}</td>
    </tr>
  );
};
