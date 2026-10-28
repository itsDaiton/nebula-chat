import type { ButtonProps, InputProps } from '@chakra-ui/react';
import type { ThemeProviderProps } from 'next-themes';
import type { ReactNode, Ref } from 'react';

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

export type AppHeaderProps = {
  isDesktop: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onOpenSearch: () => void;
};

export type AppShellProps = {
  children: ReactNode;
};

export type NebulaLogoProps = {
  className?: string;
};

export type IconActionProps = {
  label: string;
  shortcut?: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
};

export type PanelState = {
  leftOpen: boolean;
  rightOpen: boolean;
  /** The Inspector as a bottom sheet below the large breakpoint; transient. */
  sheetOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  closeSheet: () => void;
  toggleSheet: () => void;
};

export type OS = 'mac' | 'windows';

/** A password field whose masking its owner controls. */
export type PasswordInputProps = Omit<InputProps, 'type'> & {
  ref?: Ref<HTMLInputElement>;
  visible: boolean;
  onToggleVisibility: () => void;
};

export type ScrollPositionState = {
  isAtBottom: boolean;
  markAtBottom: (isAtBottom: boolean) => void;
};
