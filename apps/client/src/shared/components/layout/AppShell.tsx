import { Outlet, useNavigate } from '@tanstack/react-router';
import { SessionsList } from '@/modules/sessions/components/SessionsList';
import { SessionsSearch } from '@/modules/sessions/components/SessionsSearch';
import { useSessions } from '@/modules/sessions/hooks/useSessions';
import { Header } from '@/shared/components/layout/Header';
import { InspectorSheet } from '@/shared/components/layout/InspectorSheet';
import { SidebarDrawer } from '@/shared/components/layout/SidebarDrawer';
import { INSPECTOR_ID, SIDEBAR_ID } from '@/shared/config/panels';
import { useOnNavigate } from '@/shared/hooks/useOnNavigate';
import { usePanels } from '@/shared/hooks/usePanels';
import { useViewportHeight } from '@/shared/hooks/useViewportHeight';
import { useSearchStore } from '@/shared/stores/useSearchStore';
import { resources } from '@/resources';

const PANEL = 'overflow-hidden rounded-xl border border-solid bg-panel';

/** The header over three panels: the sidebar, the routed page and the Inspector. */
export const AppShell = () => {
  const { showSidePanels, isSidebarOpen, isInspectorOpen, closeMobilePanels } = usePanels();
  const { isSearchOpen, closeSearch } = useSearchStore();
  const { sessions } = useSessions();
  const navigate = useNavigate();
  const viewportHeight = useViewportHeight();

  useOnNavigate(closeMobilePanels);

  const handleSessionClick = (sessionId: string) => {
    void navigate({ to: '/s/$id', params: { id: sessionId } });
    closeSearch();
  };

  return (
    <div
      data-slot="app-shell"
      className="flex flex-col bg-canvas text-foreground"
      style={{ height: viewportHeight }}
    >
      <Header />
      <div className="flex min-h-0 flex-1 gap-2.5 px-2.5 pb-2.5">
        {/* Collapsed by `hidden`, not unmounted, so the list keeps its scroll and its shortcuts. */}
        {showSidePanels && (
          <aside
            id={SIDEBAR_ID}
            data-slot="sidebar"
            aria-label={resources.shell.sidebar}
            hidden={!isSidebarOpen}
            className={`w-[270px] shrink-0 ${PANEL}`}
          >
            <SessionsList />
          </aside>
        )}
        <main data-slot="page" className={`min-w-0 flex-1 ${PANEL}`}>
          <Outlet />
        </main>
        {showSidePanels && (
          <aside
            id={INSPECTOR_ID}
            data-slot="inspector"
            aria-label={resources.shell.inspector}
            hidden={!isInspectorOpen}
            className={`w-[300px] shrink-0 ${PANEL}`}
          />
        )}
      </div>
      {!showSidePanels && (
        <>
          <SidebarDrawer />
          <InspectorSheet />
          {isSearchOpen && (
            <SessionsSearch
              sessions={sessions}
              onSessionClick={handleSessionClick}
              onClose={closeSearch}
            />
          )}
        </>
      )}
    </div>
  );
};
