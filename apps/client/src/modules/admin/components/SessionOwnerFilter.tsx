import { UserIcon } from 'lucide-react';
import { useGetUser } from '@/libs/api/generated/admin/admin';
import { AuditFilterChip } from '@/modules/admin/components/AuditFilterChip';
import type { SessionOwnerFilterProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';

const { filter: text } = resources.admin.sessions;

/** The owner the table is narrowed to; it exists only while the URL names one, and the × lifts it. */
export const SessionOwnerFilter = ({ userId, onClear }: SessionOwnerFilterProps) => {
  const { data } = useGetUser(userId, { query: { meta: { inlineError: true } } });

  return (
    <AuditFilterChip
      active
      clearLabel={resources.admin.audit.filter.clear(text.owner)}
      onClear={onClear}
    >
      <span className="inline-flex h-full items-center gap-1.5 px-2.5 [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
        <UserIcon />
        {`${text.owner}: ${data?.name ?? userId}`}
      </span>
    </AuditFilterChip>
  );
};
