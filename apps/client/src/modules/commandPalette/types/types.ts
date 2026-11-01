import type { ReactNode } from 'react';

export type PaletteAction = {
  id: string;
  group: string;
  label: string;
  keywords?: string[];
  icon: ReactNode;
  /** Keys that follow the platform modifier in the hint, e.g. `['⇧', 'Y']`. */
  shortcut?: string[];
  /** A tag at the end of the row, e.g. `Admin`. */
  badge?: string;
  perform: () => void;
  /** Hidden from the palette while false. */
  visible?: boolean;
};

export type CommandPaletteState = {
  actions: PaletteAction[];
  query: string;
  debouncedQuery: string;
  /** Adds the actions and returns the function that removes them again. */
  register: (actions: PaletteAction[]) => () => void;
  setQuery: (query: string) => void;
  clearQuery: () => void;
};

export type PaletteSessionsGroupProps = {
  onSelect: (sessionId: string) => void;
};

export type HighlightedTextProps = {
  text: string;
  query: string;
};
