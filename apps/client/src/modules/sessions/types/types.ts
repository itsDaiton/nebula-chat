import type { InfiniteData, QueryKey } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import type { Session } from '@/libs/api/generated/model/session';
import type { SessionPage } from '@/libs/api/generated/model/sessionPage';

export type SessionListItemProps = {
  session: Session;
  /** The time the relative age is measured against, in ms. */
  now: number;
  onNavigate?: () => void;
  onArchive: (session: Session) => void;
};

export type SessionsSearchState = {
  searchQuery: string;
  debouncedQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
};

export type UseSessionsSearchParams = {
  localSessions: Session[];
  onClose: () => void;
  onSessionClick: (sessionId: string) => void;
};

export type SessionsSearchProps = {
  sessions: Session[];
  onSessionClick: (id: string) => void;
  onClose: () => void;
};

export type SessionListSkeletonsProps = {
  count?: number;
};

export type UseInfiniteScrollOptions = {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void | Promise<void>;
  threshold?: number;
};

export type SessionsListProps = {
  /** Called after the list navigates, so the mobile drawer can close. */
  onNavigate?: () => void;
};

export type NavigationAction = {
  id: string;
  icon: ReactElement;
  label: string;
  action: 'newChat' | 'search' | 'files' | 'aiStudio';
  /** The letter of the Ctrl/⌘ shortcut; a row without one is not yet available. */
  shortcut?: string;
};

export type NavigationRowProps = {
  action: NavigationAction;
  onClick: () => void;
};

/** The list cache an archive edits, kept so a failed archive can put it back. */
export type ArchiveContext = {
  snapshot: [QueryKey, InfiniteData<SessionPage> | undefined][];
  title?: string;
};
