import type { ButtonProps } from '@chakra-ui/react';
import type { ThemeProviderProps } from 'next-themes';
import type { ReactElement, ReactNode } from 'react';

export type LayoutProps = {
  children: ReactNode;
};

export type SidePanelProps = {
  children?: ReactNode;
};

export type HeaderProps = {
  onMenuClick?: () => void;
};

export type MarkdownContentProps = {
  content: string;
};

export type ColorMode = 'light' | 'dark';

export type UseColorModeReturn = {
  colorMode: ColorMode;
  setColorMode: (colorMode: ColorMode) => void;
  toggleColorMode: () => void;
};

export type ColorModeProviderProps = ThemeProviderProps;

export type NebulaButtonProps = ButtonProps;

export type NebulaMenuItemProps = {
  id: number;
  value: string;
  label: string;
  onClick?: () => void;
};

export type BadgeConfig = {
  text: string;
  colorPalette?: string;
  variant?: 'solid' | 'subtle' | 'outline' | 'surface' | 'plain';
};

export type ShortcutConfig = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type NavigationAction = {
  id: string;
  icon: ReactElement;
  label: string;
  badge?: BadgeConfig;
  action: 'newChat' | 'search' | 'files' | 'aiStudio';
  shortcut?: ShortcutConfig;
};

export type BadgeActionButtonProps = {
  icon: ReactElement;
  label: string;
  onClick: () => void;
  badge?: BadgeConfig;
  shortcut?: ShortcutConfig;
};

export type SearchState = {
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
};

export type DrawerState = {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

export type OS = 'mac' | 'windows';
