import type { UserStatusBadgeProps } from '@/modules/admin/types/types';
import { USER_BADGE, USER_STATUS_BADGE } from '@/modules/admin/utils/userBadge';
import { resources } from '@/resources';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';

export const UserStatusBadge = ({ status }: UserStatusBadgeProps) => (
  <Badge variant="outline" className={cn(USER_BADGE, USER_STATUS_BADGE[status])}>
    {resources.admin.users.statuses[status]}
  </Badge>
);
