import type { UserLastActiveProps } from '@/modules/admin/types/types';
import { useNow } from '@/shared/hooks/useNow';
import { formatLongRelativeTime, formatRelativeTime } from '@/shared/utils/relativeTime';

/** How long ago a User was last active: `6d` in the table, `6 days ago` in the detail. */
export const UserLastActive = ({ at, long = false }: UserLastActiveProps) => {
  const now = useNow();
  return <time dateTime={at}>{(long ? formatLongRelativeTime : formatRelativeTime)(at, now)}</time>;
};
