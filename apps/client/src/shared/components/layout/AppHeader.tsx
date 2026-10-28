import {
  MenuIcon,
  MoonIcon,
  PanelLeftIcon,
  PanelRightIcon,
  SearchIcon,
  SunIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useGetSession } from '@/libs/api/generated/sessions/sessions';
import { resources } from '@/resources';
import { NebulaLogo } from '@/shared/components/NebulaLogo';
import { IconAction } from '@/shared/components/layout/IconAction';
import { Button } from '@/shared/components/ui/button';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Kbd } from '@/shared/components/ui/kbd';
import { cn } from '@/shared/utils/cn';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';
import { useOS } from '@/shared/hooks/useOS';
import type { AppHeaderProps } from '@/shared/types/types';
import { useColorMode } from '@/theme/hooks/useColorMode';

export const AppHeader = ({
  isDesktop,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  onOpenSearch,
}: AppHeaderProps) => {
  const modifier = resources.shell.modifier[useOS()];
  const { colorMode, toggleColorMode } = useColorMode();
  useKeyboardShortcut('y', toggleColorMode, { ctrl: true, shift: true });
  const { id } = useParams({ strict: false });
  const { data: session } = useGetSession(id ?? '', { query: { enabled: Boolean(id) } });

  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-2 px-1',
        !isDesktop && 'border-b border-border px-3',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {isDesktop && <NebulaLogo />}
        <IconAction
          label={isDesktop ? resources.shell.togglePanel.left : resources.shell.menu}
          shortcut={`${modifier} B`}
          pressed={leftOpen}
          onClick={onToggleLeft}
        >
          {isDesktop ? <PanelLeftIcon /> : <MenuIcon />}
        </IconAction>
        {!isDesktop && <NebulaLogo />}
        {session && (
          <>
            <span aria-hidden className="text-faint">
              /
            </span>
            <h1 className="min-w-0 truncate text-[13px] font-normal text-foreground-secondary">
              {session.title}
            </h1>
          </>
        )}
      </div>
      <Button
        variant="outline"
        className="hidden h-[30px] w-[340px] justify-start px-2.5 text-[12.5px] font-normal text-muted-foreground sm:inline-flex"
        onClick={onOpenSearch}
      >
        <SearchIcon />
        {resources.shell.search}
        <Kbd className="ml-auto">{`${modifier} K`}</Kbd>
      </Button>
      <div className="flex flex-1 items-center justify-end gap-1">
        <IconButton
          variant="ghost"
          size="icon"
          className="sm:hidden"
          label={resources.shell.search}
          side="bottom"
          onClick={onOpenSearch}
        >
          <SearchIcon />
        </IconButton>
        <IconAction
          label={resources.shell.togglePanel.right}
          shortcut={`${modifier} I`}
          pressed={rightOpen}
          onClick={onToggleRight}
        >
          <PanelRightIcon />
        </IconAction>
        <IconAction
          label={resources.shell.toggleColorMode}
          shortcut={`${modifier} ⇧ Y`}
          onClick={toggleColorMode}
        >
          {colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconAction>
      </div>
    </header>
  );
};
