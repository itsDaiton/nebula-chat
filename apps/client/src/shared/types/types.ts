import type { ComponentProps, ReactNode } from 'react';

export type MarkdownContentProps = {
  content: string;
};

export type ThemeMode = 'light' | 'dark';

export type UseThemeModeReturn = {
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => void;
  toggleThemeMode: () => void;
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

export type AppHeaderProps = {
  isDesktop: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onOpenSearch: () => void;
  /** A page with nothing to inspect has no right panel to toggle. */
  hideRightToggle?: boolean;
};

export type AppShellProps = {
  children: ReactNode;
  /** The left panel's body above the account footer; the Sessions list when unset. */
  renderLeftPanel?: (onNavigate?: () => void) => ReactNode;
  /** The right panel's body; the Inspector when unset. */
  renderRightPanel?: (onClose: () => void) => ReactNode;
  hideRightPanel?: boolean;
};

export type ModelProvider = 'anthropic' | 'openai';

export type ProviderLogoProps = {
  provider: ModelProvider;
  className?: string;
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
  /** Opens the Inspector in whichever form the layout shows it. */
  openRight: () => void;
  /** Opens the Inspector's desktop panel only, leaving the mobile sheet down. */
  openRightPanel: () => void;
  closeSheet: () => void;
  toggleSheet: () => void;
};

export type OS = 'mac' | 'windows';

/** A password field whose masking its owner controls. */
export type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  visible: boolean;
  onToggleVisibility: () => void;
};

export type ScrollPositionState = {
  isAtBottom: boolean;
  markAtBottom: (isAtBottom: boolean) => void;
};

export type ChartDatum = { date: string; seriesKey: string; value: number };

export type ChartSeries = { key: string; label: string };

type ChartTooltipRow = { key: string; label: string; value: number; active: boolean };

type ChartTooltipContext = { index: number; date: string; rows: ChartTooltipRow[] };

export type StackedAreaChartProps = {
  data: readonly ChartDatum[];
  series: readonly ChartSeries[];
  activeSeries: string | null;
  onActiveSeriesChange: (key: string | null) => void;
  hoverIndex: number | null;
  onHoverIndexChange: (index: number | null) => void;
  height?: number;
  ariaLabel: string;
  formatValue?: (value: number) => string;
  formatDate?: (date: string) => string;
  renderTooltip?: (context: ChartTooltipContext) => ReactNode;
};

export type ShareBarProps = { share: number; active?: boolean };
