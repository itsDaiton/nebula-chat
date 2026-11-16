import { useRef } from 'react';
import { cn } from '@/shared/utils/cn';
import { useRouterState } from '@tanstack/react-router';
import { AccountFooter } from '@/shared/components/layout/AccountFooter';
import { Inspector } from '@/modules/inspector/components/Inspector';
import { SessionsList } from '@/modules/sessions/components/SessionsList';
import { CommandPalette } from '@/modules/commandPalette/components/CommandPalette';
import { useDefaultPaletteActions } from '@/modules/commandPalette/hooks/useDefaultPaletteActions';
import { useAuthPaletteActions } from '@/modules/auth/hooks/useAuthPaletteActions';
import { useChatPaletteActions } from '@/modules/chat/hooks/useChatPaletteActions';
import { useSessionPaletteActions } from '@/modules/sessions/hooks/useSessionPaletteActions';
import { SettingsDialog } from '@/modules/settings/components/SettingsDialog';
import { useSettingsPaletteActions } from '@/modules/settings/hooks/useSettingsPaletteActions';
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

const sessionsPanel = (onNavigate?: () => void) => <SessionsList onNavigate={onNavigate} />;
const inspectorPanel = (onClose: () => void) => <Inspector onClose={onClose} />;

export const AppShell = ({
  children,
  renderLeftPanel = sessionsPanel,
  renderRightPanel = inspectorPanel,
  hideRightPanel = false,
}: AppShellProps) => {
  const { showSidePanels: isDesktop } = useResponsiveLayout();
  const { leftOpen, rightOpen, sheetOpen, toggleLeft, toggleRight, closeSheet, toggleSheet } =
    usePanelStore();
  const { isDrawerOpen, closeDrawer, toggleDrawer, openSearch } = useDrawer();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const viewportHeight = useViewportHeight();

  // The overlays belong to the small layout and to the page they opened over (guarded render-time write, no effect).
  const frame = useRef({ pathname, isDesktop });
  if (frame.current.pathname !== pathname || frame.current.isDesktop !== isDesktop) {
    frame.current = { pathname, isDesktop };
    // Deferred: a store write during render warns about updating subscribers mid-render.
    queueMicrotask(() => {
      closeDrawer();
      closeSheet();
    });
  }

  const onToggleLeft = isDesktop ? toggleLeft : toggleDrawer;
  const onToggleRight = isDesktop ? toggleRight : toggleSheet;
  useKeyboardShortcut('b', onToggleLeft, { ctrl: true });
  useKeyboardShortcut('i', onToggleRight, { ctrl: true });
  useKeyboardShortcut('k', openSearch, { ctrl: true });
  useSessionPaletteActions();
  useChatPaletteActions();
  useDefaultPaletteActions();
  useSettingsPaletteActions();
  useAuthPaletteActions();

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
        hideRightToggle={hideRightPanel}
      />
      <CommandPalette />
      <SettingsDialog />
      <div className="flex min-h-0 flex-1 gap-2.5">
        {isDesktop && leftOpen && (
          <aside className={`${panel} w-[270px] shrink-0 2xl:w-[320px]`}>
            {renderLeftPanel()}
            <AccountFooter />
          </aside>
        )}
        <main
          className={cn(panel, 'min-w-0 flex-1', !isDesktop && 'rounded-none border-0 bg-canvas')}
        >
          {children}
        </main>
        {isDesktop && rightOpen && !hideRightPanel && (
          <aside
            aria-label={resources.shell.inspector}
            className={`${panel} w-[300px] shrink-0 2xl:w-[360px]`}
          >
            {renderRightPanel(toggleRight)}
          </aside>
        )}
      </div>
      {!isDesktop && (
        <>
          <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
            <SheetContent side="left" showCloseButton={false} className="gap-0">
              <SheetTitle className="sr-only">{resources.shell.menu}</SheetTitle>
              {renderLeftPanel(closeDrawer)}
              <AccountFooter />
            </SheetContent>
          </Sheet>
          <Sheet open={sheetOpen && !hideRightPanel} onOpenChange={(open) => !open && closeSheet()}>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              className="max-h-[70dvh] gap-0 rounded-t-2xl"
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong" />
              <SheetTitle className="sr-only">{resources.shell.inspector}</SheetTitle>
              {renderRightPanel(closeSheet)}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
};
