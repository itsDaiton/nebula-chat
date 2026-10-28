import type { ReactNode } from 'react';

export type PaletteAction = {
  id: string;
  group: string;
  label: string;
  keywords?: string[];
  icon: ReactNode;
  /** Key hint shown after the platform modifier, e.g. `E`. */
  shortcut?: string;
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
