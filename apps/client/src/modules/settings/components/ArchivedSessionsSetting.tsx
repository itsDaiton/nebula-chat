import { ArchiveRestoreIcon, EyeIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { SettingsGroup } from '@/modules/settings/components/SettingsGroup';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { useArchivedSessions } from '@/modules/settings/hooks/useArchivedSessions';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { useSessionRestore } from '@/modules/sessions/hooks/useSessionRestore';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { formatRelativeTime } from '@/shared/utils/relativeTime';

const { archived } = resources.settings;

/** The archived Sessions: Open reads one in the chat, Restore puts it back in the left panel. */
export const ArchivedSessionsSetting = () => {
  const { sessions, isLoading, error, hasMore, isLoadingMore, loadMore } = useArchivedSessions();
  const { mutate: restore, isPending, variables } = useSessionRestore();
  const closeSettings = useSettingsDialogStore((state) => state.closeSettings);
  const navigate = useNavigate();

  const open = (id: string) => {
    closeSettings();
    void navigate({ to: '/s/$id', params: { id } });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{archived.description}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {archived.error}
        </p>
      )}
      {!isLoading && !error && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">{archived.empty}</p>
      )}
      {sessions.length > 0 && (
        <SettingsGroup>
          {sessions.map((session) => (
            <SettingsRow
              key={session.id}
              label={session.title}
              description={archived.meta(formatRelativeTime(session.createdAt, Date.now()))}
            >
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  aria-label={`${archived.open} ${session.title}`}
                  onClick={() => open(session.id)}
                >
                  <EyeIcon />
                  {archived.open}
                </Button>
                <Button
                  variant="outline"
                  aria-label={`${archived.restore} ${session.title}`}
                  disabled={isPending && variables?.sessionId === session.id}
                  onClick={() => restore({ sessionId: session.id })}
                >
                  <ArchiveRestoreIcon />
                  {archived.restore}
                </Button>
              </div>
            </SettingsRow>
          ))}
        </SettingsGroup>
      )}
      {hasMore && (
        <div>
          <Button variant="outline" disabled={isLoadingMore} onClick={loadMore}>
            {archived.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
};
