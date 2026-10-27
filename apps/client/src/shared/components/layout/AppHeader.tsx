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
import { Kbd } from '@/shared/components/ui/kbd';
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
  const { id } = useParams({ strict: false });
  const { data: session } = useGetSession(id ?? '', { query: { enabled: Boolean(id) } });

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-1">
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
          <h1 className="min-w-0 truncate text-sm font-medium text-foreground-secondary">
            {session.title}
          </h1>
        )}
      </div>
      <Button
        variant="outline"
        className="hidden w-[340px] justify-start text-muted-foreground sm:inline-flex"
        onClick={onOpenSearch}
      >
        <SearchIcon />
        {resources.shell.search}
        <Kbd className="ml-auto">{`${modifier} K`}</Kbd>
      </Button>
      <div className="flex flex-1 items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label={resources.shell.search}
          onClick={onOpenSearch}
        >
          <SearchIcon />
        </Button>
        <IconAction
          label={resources.shell.togglePanel.right}
          shortcut={`${modifier} I`}
          pressed={rightOpen}
          onClick={onToggleRight}
        >
          <PanelRightIcon />
        </IconAction>
        <IconAction label={resources.shell.toggleColorMode} onClick={toggleColorMode}>
          {colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconAction>
      </div>
    </header>
  );
};
