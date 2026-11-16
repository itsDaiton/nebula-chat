import type { AdminUserSummaryStatus } from '@/libs/api/generated/model/adminUserSummaryStatus';

export const USER_BADGE =
  'h-[19px] rounded-md border-border-strong px-1.5 font-mono text-[10.5px] text-muted-foreground';

// Colour marks state only: red for a ban, amber for a deletion that can still be undone.
export const USER_STATUS_BADGE: Record<AdminUserSummaryStatus, string> = {
  registered: '',
  unverified: 'border-dashed',
  admin: 'bg-hover text-foreground',
  banned: 'border-destructive/40 bg-destructive/8 text-destructive',
  pendingDeletion: 'border-warning/40 bg-warning/8 text-warning',
  guest: 'border-dashed',
};
