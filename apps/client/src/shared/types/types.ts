import type { ButtonProps, InputProps } from '@chakra-ui/react';
import type { ThemeProviderProps } from 'next-themes';
import type { ButtonHTMLAttributes, ReactElement, Ref } from 'react';

export type HeaderButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  label: string;
  shortcut?: ShortcutConfig;
};

export type ShortcutKeysProps = {
  shortcut: ShortcutConfig;
  className?: string;
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

type BadgeConfig = {
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

export type PanelState = {
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  isDrawerOpen: boolean;
  isSheetOpen: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleDrawer: () => void;
  toggleSheet: () => void;
  closeMobilePanels: () => void;
};

export type OS = 'mac' | 'windows';

/** A password field whose masking its owner controls. */
export type PasswordInputProps = Omit<InputProps, 'type'> & {
  ref?: Ref<HTMLInputElement>;
  visible: boolean;
  onToggleVisibility: () => void;
};
