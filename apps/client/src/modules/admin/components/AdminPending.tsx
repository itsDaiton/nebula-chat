import { AdminNav } from '@/modules/admin/components/AdminNav';
import { resources } from '@/resources';
import { AppShell } from '@/shared/components/layout/AppShell';
import { Skeleton } from '@/shared/components/ui/skeleton';

// The guard runs before AdminLayout mounts, so this draws its own shell to keep the layout from jumping.
export const AdminPending = () => (
  <AppShell renderLeftPanel={(onNavigate) => <AdminNav onNavigate={onNavigate} />} hideRightPanel>
    <output
      aria-label={resources.admin.loading}
      aria-busy="true"
      className="flex min-h-0 flex-1 flex-col gap-3 px-5 pt-4"
    >
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[7.5rem] rounded-xl" />
        ))}
      </div>
    </output>
  </AppShell>
);
