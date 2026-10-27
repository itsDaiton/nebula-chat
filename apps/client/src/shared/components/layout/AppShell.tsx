import { useEffect, type ReactNode } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { AccountStatus } from '@/modules/auth/components/AccountStatus';
import { SessionsList } from '@/modules/sessions/components/SessionsList';
import { SessionsSearch } from '@/modules/sessions/components/SessionsSearch';
import { useSessions } from '@/modules/sessions/hooks/useSessions';
import { resources } from '@/resources';
import { AppHeader } from '@/shared/components/layout/AppHeader';
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/sheet';
import { useDrawer } from '@/shared/hooks/useDrawer';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { useViewportHeight } from '@/shared/hooks/useViewportHeight';
import { usePanelStore } from '@/shared/stores/usePanelStore';

const panel = 'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-panel';

const InspectorPlaceholder = () => (
  <p className="p-4 text-sm text-muted-foreground">{resources.shell.inspectorHint}</p>
);

const Account = () => (
  <div className="flex shrink-0 justify-end border-t border-border p-2">
    <AccountStatus />
  </div>
);

/** The chat routes' frame: header on the canvas, then left navigation, centre content and the Inspector as bordered panels. */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const { showSidePanels: isDesktop } = useResponsiveLayout();
  const { leftOpen, rightOpen, sheetOpen, toggleLeft, toggleRight, closeSheet, toggleSheet } =
    usePanelStore();
  const { isDrawerOpen, closeDrawer, toggleDrawer, isSearchOpen, openSearch, closeSearch } =
    useDrawer();
  const { sessions } = useSessions();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const viewportHeight = useViewportHeight();

  // The overlays belong to the small layout and to the page they opened over.
  useEffect(() => {
    closeDrawer();
    closeSheet();
  }, [pathname, isDesktop, closeDrawer, closeSheet]);

  const onToggleLeft = isDesktop ? toggleLeft : toggleDrawer;
  const onToggleRight = isDesktop ? toggleRight : toggleSheet;
  useKeyboardShortcut('b', onToggleLeft, { ctrl: true });
  useKeyboardShortcut('i', onToggleRight, { ctrl: true });

  // The list mounts its own search while it is on screen.
  const searchHere = isSearchOpen && !(isDesktop && leftOpen);

  return (
    <div
      className="flex flex-col bg-canvas px-2.5 pb-2.5 text-foreground"
      style={{ height: viewportHeight }}
    >
      <AppHeader
        isDesktop={isDesktop}
        leftOpen={isDesktop ? leftOpen : isDrawerOpen}
        rightOpen={isDesktop ? rightOpen : sheetOpen}
        onToggleLeft={onToggleLeft}
        onToggleRight={onToggleRight}
        onOpenSearch={openSearch}
      />
      {searchHere && (
        <SessionsSearch
          sessions={sessions}
          onSessionClick={(id) => {
            void navigate({ to: '/s/$id', params: { id } });
            closeSearch();
          }}
          onClose={closeSearch}
        />
      )}
      <div className="flex min-h-0 flex-1 gap-2.5">
        {isDesktop && leftOpen && (
          <aside className={`${panel} w-[270px] shrink-0`}>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SessionsList />
            </div>
            <Account />
          </aside>
        )}
        <main className={`${panel} min-w-0 flex-1`}>{children}</main>
        {isDesktop && rightOpen && (
          <aside aria-label={resources.shell.inspector} className={`${panel} w-[300px] shrink-0`}>
            <InspectorPlaceholder />
          </aside>
        )}
      </div>
      {!isDesktop && (
        <>
          <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
            <SheetContent side="left" showCloseButton={false} className="gap-0">
              <SheetTitle className="sr-only">{resources.shell.menu}</SheetTitle>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <SessionsList
                  inDrawer
                  onClose={closeDrawer}
                  toggleSearch={() => (isSearchOpen ? closeSearch() : openSearch())}
                  closeSearch={closeSearch}
                />
              </div>
              <Account />
            </SheetContent>
          </Sheet>
          <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()}>
            <SheetContent side="bottom" className="max-h-[70dvh] gap-0 rounded-t-2xl">
              <SheetTitle className="p-4">{resources.shell.inspector}</SheetTitle>
              <InspectorPlaceholder />
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
};
