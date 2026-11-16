import { Link, getRouteApi } from '@tanstack/react-router';
import { ArrowLeftIcon, EyeIcon } from 'lucide-react';
import { ChatMessageList } from '@/modules/chat/components/ChatMessageList';
import { mapSessionMessages } from '@/modules/chat/utils/mapSessionMessages';
import { useSessionRead } from '@/modules/admin/hooks/useSessionRead';
import { resources } from '@/resources';
import { Skeleton } from '@/shared/components/ui/skeleton';

const route = getRouteApi('/_app/admin/sessions_/$id');
const text = resources.admin.sessions.transcript;

/** A Session's Messages as an Admin reads them: the chat's own rendering, read-only, under a notice of the Audit entry. */
export const SessionTranscriptPage = () => {
  const { id } = route.useParams();
  const { data: session, isPending, isError } = useSessionRead(id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-5 py-3 text-[13px] text-muted-foreground">
        {session && (
          <>
            <EyeIcon className="size-4 shrink-0" />
            <p>{text.notice}</p>
          </>
        )}
        <Link
          to="/admin/sessions"
          search={(previous) => previous}
          className="ml-auto inline-flex items-center gap-1.5 rounded-sm whitespace-nowrap text-foreground-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeftIcon className="size-3.5" />
          {text.back}
        </Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-(--transcript-width) px-3 pt-6 sm:px-7">
          {isPending && (
            <output aria-label={text.loading} className="flex flex-col gap-4">
              <Skeleton className="ml-auto h-10 w-2/3" />
              <Skeleton className="h-24" />
            </output>
          )}
          {isError && (
            <p role="alert" className="text-sm text-destructive">
              {text.loadFailed}
            </p>
          )}
          {session?.messages.length === 0 && (
            <p className="text-sm text-muted-foreground">{text.empty}</p>
          )}
          {session && (
            <ChatMessageList
              history={mapSessionMessages(session.messages)}
              isStreaming={false}
              readOnly
            />
          )}
        </div>
      </div>
    </div>
  );
};
