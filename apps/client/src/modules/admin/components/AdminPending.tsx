import { AdminNav } from '@/modules/admin/components/AdminNav';
import { OverviewTilesSkeleton } from '@/modules/admin/components/OverviewTilesSkeleton';
import { resources } from '@/resources';
import { AppShell } from '@/shared/components/layout/AppShell';
import { Skeleton } from '@/shared/components/ui/skeleton';

// The guard runs before AdminLayout mounts, so this draws its own shell to keep the layout from jumping.
export const AdminPending = () => (
  <AppShell renderLeftPanel={(onNavigate) => <AdminNav onNavigate={onNavigate} />} hideRightPanel>
    <output
      aria-label={resources.admin.loading}
      className="flex min-h-0 flex-1 flex-col gap-3 px-5 pt-4"
    >
      <Skeleton className="h-7 w-40" />
      <OverviewTilesSkeleton />
    </output>
  </AppShell>
);
