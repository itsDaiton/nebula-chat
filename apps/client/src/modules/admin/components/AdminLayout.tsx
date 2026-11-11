import { Outlet, useRouterState } from '@tanstack/react-router';
import { AdminDetailPanel } from '@/modules/admin/components/AdminDetailPanel';
import { AdminNav } from '@/modules/admin/components/AdminNav';
import { adminNavigation } from '@/modules/admin/utils/adminNavigation';
import { AppShell } from '@/shared/components/layout/AppShell';

const pagesWithDetail: string[] = adminNavigation
  .flatMap((group) => group.pages)
  .flatMap((page) => (page.hasDetail && page.to ? [page.to] : []));

/** The admin dashboard inside the redesigned shell: its navigation on the left, a row's detail on the right. */
export const AdminLayout = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <AppShell
      renderLeftPanel={(onNavigate) => <AdminNav onNavigate={onNavigate} />}
      renderRightPanel={(onClose) => <AdminDetailPanel path={pathname} onClose={onClose} />}
      hideRightPanel={!pagesWithDetail.includes(pathname)}
    >
      <Outlet />
    </AppShell>
  );
};
