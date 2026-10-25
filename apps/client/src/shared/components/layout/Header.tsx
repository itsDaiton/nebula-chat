import { Link } from '@tanstack/react-router';
import { MenuIcon, OrbitIcon, PanelLeftIcon, PanelRightIcon } from 'lucide-react';
import { AccountStatus } from '@/modules/auth/components/AccountStatus';
import { CommandHint } from '@/shared/components/layout/CommandHint';
import { HeaderButton } from '@/shared/components/layout/HeaderButton';
import { ThemeToggle } from '@/shared/components/layout/ThemeToggle';
import {
  INSPECTOR_ID,
  INSPECTOR_SHORTCUT,
  SIDEBAR_ID,
  SIDEBAR_SHORTCUT,
} from '@/shared/config/panels';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';
import { usePanels } from '@/shared/hooks/usePanels';
import { resources } from '@/resources';

export const Header = () => {
  const { showSidePanels, isSidebarOpen, isInspectorOpen, toggleSidebar, toggleInspector } =
    usePanels();

  useKeyboardShortcut(SIDEBAR_SHORTCUT.key, toggleSidebar, SIDEBAR_SHORTCUT);
  useKeyboardShortcut(INSPECTOR_SHORTCUT.key, toggleInspector, INSPECTOR_SHORTCUT);

  // On desktop the toggles collapse a panel in place; below it they open it as a dialog.
  const popup = showSidePanels ? undefined : 'dialog';

  return (
    <header
      data-slot="header"
      className="flex h-12 shrink-0 items-center gap-2 px-2.5 text-foreground"
    >
      <HeaderButton
        label={showSidePanels ? resources.shell.toggleSidebar : resources.shell.openSidebar}
        shortcut={SIDEBAR_SHORTCUT}
        onClick={toggleSidebar}
        aria-expanded={isSidebarOpen}
        aria-controls={showSidePanels ? SIDEBAR_ID : undefined}
        aria-haspopup={popup}
      >
        {showSidePanels ? <PanelLeftIcon /> : <MenuIcon />}
      </HeaderButton>
      <Link
        to="/"
        aria-label={resources.shell.home}
        className="flex items-center gap-2 rounded-lg px-1 text-[15px] font-semibold tracking-tight text-foreground no-underline"
      >
        <OrbitIcon className="size-5" aria-hidden />
        <span className="hidden sm:inline">{resources.chat.appName}</span>
      </Link>
      <div className="flex flex-1 justify-center">
        <CommandHint />
      </div>
      <HeaderButton
        label={showSidePanels ? resources.shell.toggleInspector : resources.shell.openInspector}
        shortcut={INSPECTOR_SHORTCUT}
        onClick={toggleInspector}
        aria-expanded={isInspectorOpen}
        aria-controls={showSidePanels ? INSPECTOR_ID : undefined}
        aria-haspopup={popup}
      >
        <PanelRightIcon />
      </HeaderButton>
      <ThemeToggle />
      <AccountStatus />
    </header>
  );
};
