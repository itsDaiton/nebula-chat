import type { Session } from '@/libs/api/generated/model/session';

export type SessionListItemProps = {
  session: Session;
  onClick: (id: string) => void;
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
  onClose?: () => void;
  inDrawer?: boolean;
  toggleSearch?: () => void;
  closeSearch?: () => void;
};
