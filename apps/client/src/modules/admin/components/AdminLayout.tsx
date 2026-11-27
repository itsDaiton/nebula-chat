import { Outlet, useRouterState } from '@tanstack/react-router';
import { AdminDetailPanel } from '@/modules/admin/components/AdminDetailPanel';
import { AdminNav } from '@/modules/admin/components/AdminNav';
import { LogLevelPanel } from '@/modules/admin/components/LogLevelPanel';
import { RunDetailPanel } from '@/modules/admin/components/RunDetailPanel';
import { SessionMetaPanel } from '@/modules/admin/components/SessionMetaPanel';
import { UsageDetailPanel } from '@/modules/admin/components/UsageDetailPanel';
import { UserDetailPanel } from '@/modules/admin/components/UserDetailPanel';
import { adminNavigation } from '@/modules/admin/utils/adminNavigation';
import { AppShell } from '@/shared/components/layout/AppShell';

const pagesWithDetail = new Set<string>(
  adminNavigation
    .flatMap((group) => group.pages)
    .flatMap((page) => (page.hasDetail ? [page.to] : [])),
);

/** The admin dashboard inside the redesigned shell: its navigation on the left, a row's detail on the right. */
export const AdminLayout = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isTranscript = pathname.startsWith('/admin/sessions/');

  return (
    <AppShell
      renderLeftPanel={(onNavigate) => <AdminNav onNavigate={onNavigate} />}
      // Users, Runs and an open Session keep theirs in the URL; the other tables keep their row in the store.
      renderRightPanel={(onClose) => {
        if (isTranscript) return <SessionMetaPanel onClose={onClose} />;
        if (pathname === '/admin/usage') return <UsageDetailPanel onClose={onClose} />;
        if (pathname === '/admin/runs') return <RunDetailPanel onClose={onClose} />;
        if (pathname === '/admin/users') return <UserDetailPanel onClose={onClose} />;
        if (pathname === '/admin/operations') return <LogLevelPanel onClose={onClose} />;
        return <AdminDetailPanel path={pathname} onClose={onClose} />;
      }}
      hideRightPanel={!isTranscript && !pagesWithDetail.has(pathname)}
    >
      <Outlet />
    </AppShell>
  );
};
