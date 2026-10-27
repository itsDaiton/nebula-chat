import { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { AccountFooter } from '@/shared/components/layout/AccountFooter';
import { InspectorPlaceholder } from '@/shared/components/layout/InspectorPlaceholder';
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
import type { AppShellProps } from '@/shared/types/types';
import { usePanelStore } from '@/shared/stores/usePanelStore';

const panel = 'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-panel';

export const AppShell = ({ children }: AppShellProps) => {
  const { showSidePanels: isDesktop } = useResponsiveLayout();
  const { leftOpen, rightOpen, sheetOpen, toggleLeft, toggleRight, closeSheet, toggleSheet } =
    usePanelStore();
  const { isDrawerOpen, closeDrawer, toggleDrawer, isSearchOpen, openSearch, closeSearch } =
    useDrawer();
  const { sessions } = useSessions();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const viewportHeight = useViewportHeight();

  // The overlays belong to the small layout and to the page they opened over (guarded render-time write, no effect).
  const [frame, setFrame] = useState({ pathname, isDesktop });
  if (frame.pathname !== pathname || frame.isDesktop !== isDesktop) {
    setFrame({ pathname, isDesktop });
    closeDrawer();
    closeSheet();
  }

  const onToggleLeft = isDesktop ? toggleLeft : toggleDrawer;
  const onToggleRight = isDesktop ? toggleRight : toggleSheet;
  useKeyboardShortcut('b', onToggleLeft, { ctrl: true });
  useKeyboardShortcut('i', onToggleRight, { ctrl: true });

  // The list mounts its own search while it is on screen.
  const searchHere = isSearchOpen && !(isDesktop && leftOpen);

  return (
    <div
      className={cn(
        'app-shell flex flex-col bg-canvas text-foreground',
        isDesktop && 'px-2.5 pb-2.5',
      )}
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
            <AccountFooter />
          </aside>
        )}
        <main
          className={cn(panel, 'min-w-0 flex-1', !isDesktop && 'rounded-none border-0 bg-canvas')}
        >
          {children}
        </main>
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
              <AccountFooter />
            </SheetContent>
          </Sheet>
          <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()}>
            <SheetContent side="bottom" className="max-h-[70dvh] gap-0 rounded-t-2xl">
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong" />
              <SheetTitle className="p-4">{resources.shell.inspector}</SheetTitle>
              <InspectorPlaceholder />
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
};
