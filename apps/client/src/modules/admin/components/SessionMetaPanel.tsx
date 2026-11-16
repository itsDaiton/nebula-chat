import { Link, useParams } from '@tanstack/react-router';
import { ChevronRightIcon, XIcon } from 'lucide-react';
import { useGetUser } from '@/libs/api/generated/admin/admin';
import { useSessionRead } from '@/modules/admin/hooks/useSessionRead';
import type { SessionMetaPanelProps } from '@/modules/admin/types/types';
import { formatUserDateTime } from '@/modules/admin/utils/formatUserDate';
import { UserLastActive } from '@/modules/admin/components/UserLastActive';
import { resources } from '@/resources';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { initialsOf } from '@/shared/utils/initialsOf';

const text = resources.admin.sessions.panel;

/** The open Session's right panel: its owner, and its metadata from the same read the transcript made. */
export const SessionMetaPanel = ({ onClose }: SessionMetaPanelProps) => {
  // Not strict: the panel can outlive its route for a render while the dashboard navigates away.
  const { sessionId = '' } = useParams({ strict: false });
  const { data: session } = useSessionRead(sessionId);
  const { data: owner, isError } = useGetUser(session?.userId ?? '', {
    query: { enabled: Boolean(session), meta: { inlineError: true } },
  });

  const facts: [string, React.ReactNode][] = session
    ? [
        [text.title, session.title],
        [text.model, session.model],
        [text.messages, session.messageCount],
        [text.created, formatUserDateTime(session.createdAt)],
        [text.lastActivity, <UserLastActive key="last" at={session.updatedAt} long />],
        [
          text.archived,
          session.archived ? resources.admin.sessions.yes : resources.admin.sessions.no,
        ],
      ]
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11.5px] font-medium text-muted-foreground">{text.owner}</h2>
        <IconButton
          variant="ghost"
          size="icon"
          label={resources.admin.detail.close}
          onClick={onClose}
        >
          <XIcon />
        </IconButton>
      </div>
      {owner && (
        <Link
          to="/admin/users"
          search={{ selected: owner.id }}
          aria-label={text.openOwner(owner.name)}
          className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Avatar className="size-9">
            <AvatarFallback className="text-[13px]">{initialsOf(owner.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{owner.name}</span>
            <span className="block truncate font-mono text-[11px] text-faint">{owner.email}</span>
          </span>
          <ChevronRightIcon className="size-4 shrink-0 text-faint" />
        </Link>
      )}
      {!owner && !isError && <Skeleton className="h-16" />}
      {isError && (
        <p role="alert" className="text-[12.5px] text-destructive">
          {text.ownerFailed}
        </p>
      )}
      {session && (
        <section aria-label={text.session}>
          <h3 className="mb-2 text-[11.5px] font-medium text-muted-foreground">{text.session}</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-[9px] text-[12.5px]">
            {facts.map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="text-right font-mono text-xs break-words text-foreground-secondary tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
};
