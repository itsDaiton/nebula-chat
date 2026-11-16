import { Link } from '@tanstack/react-router';
import { MessageSquareIcon } from 'lucide-react';
import { useListUserSessions } from '@/libs/api/generated/admin/admin';
import type { UserSessionsListProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { Skeleton } from '@/shared/components/ui/skeleton';

const SESSIONS_SHOWN = 10;
const { detail: text } = resources.admin.users;

/** A User's newest Sessions by title; listing them is not a content read, so nothing is audited. */
export const UserSessionsList = ({ userId }: UserSessionsListProps) => {
  const { data, isPending, isError } = useListUserSessions(
    userId,
    { limit: SESSIONS_SHOWN },
    { query: { meta: { inlineError: true } } },
  );

  return (
    <section aria-label={text.sessions}>
      <h3 className="mb-2 text-[11.5px] font-medium text-muted-foreground">{text.sessions}</h3>
      {isPending && <Skeleton className="h-[30px]" />}
      {isError && <p className="text-[12.5px] text-destructive">{text.sessionsFailed}</p>}
      {data?.sessions.length === 0 && (
        <p className="text-[12.5px] text-muted-foreground">{text.noSessions}</p>
      )}
      {data && data.sessions.length > 0 && (
        <ul>
          {data.sessions.map((session) => (
            <li key={session.id}>
              <Link
                to="/admin/sessions/$id"
                params={{ id: session.id }}
                className="flex h-[30px] items-center gap-2.5 rounded-md px-1.5 text-[13px] text-foreground-secondary hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{session.title}</span>
                {session.archived && (
                  <span className="font-mono text-[10.5px] text-faint">{text.archived}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/admin/sessions"
        search={{ user: userId }}
        className="mt-1 inline-block px-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        {text.allSessions}
      </Link>
    </section>
  );
};
