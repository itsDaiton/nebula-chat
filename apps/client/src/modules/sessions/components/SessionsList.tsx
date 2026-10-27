import { useNavigate } from '@tanstack/react-router';
import { Loader2Icon } from 'lucide-react';
import { useInfiniteScroll } from '@/modules/sessions/hooks/useInfiniteScroll';
import { useSessionArchiving } from '@/modules/sessions/hooks/useSessionArchiving';
import { useSessions } from '@/modules/sessions/hooks/useSessions';
import { NavigationRow } from '@/modules/sessions/components/NavigationRow';
import { SessionListItem } from '@/modules/sessions/components/SessionListItem';
import { SessionSkeletons } from '@/modules/sessions/components/SessionSkeletons';
import type { NavigationAction, SessionsListProps } from '@/modules/sessions/types/types';
import { navigationActions } from '@/modules/sessions/utils/navigationActions';
import { resources } from '@/resources';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';
import { useNow } from '@/shared/hooks/useNow';
import { useSearchStore } from '@/shared/stores/useSearchStore';

/** The left panel's body: navigation rows, then the Sessions with their ages and the archive action. */
export const SessionsList = ({ onNavigate }: SessionsListProps = {}) => {
  const { sessions, isLoading, isLoadingMore, error, hasMore, loadMore } = useSessions();
  const openSearch = useSearchStore((state) => state.openSearch);
  const navigate = useNavigate();
  const now = useNow();
  const archive = useSessionArchiving();

  const observerTarget = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: loadMore,
  });

  const startNewChat = () => {
    void navigate({ to: '/' });
    onNavigate?.();
  };

  useKeyboardShortcut('e', startNewChat, { ctrl: true });

  const perform = (action: NavigationAction['action']) => {
    if (action === 'newChat') startNewChat();
    if (action === 'search') {
      openSearch();
      onNavigate?.();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <nav className="flex flex-col gap-px">
        {navigationActions.map((action) => (
          <NavigationRow key={action.id} action={action} onClick={() => perform(action.action)} />
        ))}
      </nav>
      <div className="flex items-center justify-between px-2 pt-3.5 pb-1.5 text-[11.5px] font-medium text-muted-foreground">
        <h2>{resources.sidebar.sessions}</h2>
        {!isLoading && (
          <span
            aria-label={resources.sidebar.count}
            className="font-mono text-[10.5px] font-normal text-faint"
          >
            {sessions.length}
            {hasMore && '+'}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <p className="p-4 text-center text-sm break-words text-destructive">{error.message}</p>
        )}
        {!error && isLoading && <SessionSkeletons />}
        {!error && !isLoading && sessions.length === 0 && (
          <div className="flex flex-col items-center px-4 py-10 text-center text-muted-foreground">
            <p className="text-sm">{resources.sessions.empty}</p>
            <p className="mt-2 text-xs">{resources.sessions.emptyHint}</p>
          </div>
        )}
        {!error && !isLoading && sessions.length > 0 && (
          <ul className="flex flex-col gap-px">
            {sessions.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                now={now}
                onNavigate={onNavigate}
                onArchive={({ id }) => archive(id)}
              />
            ))}
            <li aria-hidden className="h-0">
              <div ref={observerTarget} />
            </li>
            {isLoadingMore && (
              <li className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                {resources.sessions.loadingMore}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};
