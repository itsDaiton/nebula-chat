import { Outlet, useRouterState } from '@tanstack/react-router';
import { AdminDetailPanel } from '@/modules/admin/components/AdminDetailPanel';
import { AdminNav } from '@/modules/admin/components/AdminNav';
import { SessionMetaPanel } from '@/modules/admin/components/SessionMetaPanel';
import { UserDetailPanel } from '@/modules/admin/components/UserDetailPanel';
import { adminNavigation } from '@/modules/admin/utils/adminNavigation';
import { AppShell } from '@/shared/components/layout/AppShell';

const pagesWithDetail = new Set<string>(
  adminNavigation
    .flatMap((group) => group.pages)
    .flatMap((page) => (page.hasDetail && page.to ? [page.to] : [])),
);

/** The admin dashboard inside the redesigned shell: its navigation on the left, a row's detail on the right. */
export const AdminLayout = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isTranscript = pathname.startsWith('/admin/sessions/');

  return (
    <AppShell
      renderLeftPanel={(onNavigate) => <AdminNav onNavigate={onNavigate} />}
      // Users and an open Session keep theirs in the URL; the other tables keep their row in the store.
      renderRightPanel={(onClose) => {
        if (isTranscript) return <SessionMetaPanel onClose={onClose} />;
        if (pathname === '/admin/users') return <UserDetailPanel onClose={onClose} />;
        return <AdminDetailPanel path={pathname} onClose={onClose} />;
      }}
      hideRightPanel={!isTranscript && !pagesWithDetail.has(pathname)}
    >
      <Outlet />
    </AppShell>
  );
};
