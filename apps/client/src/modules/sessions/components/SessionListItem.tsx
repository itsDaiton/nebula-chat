import { Link, useParams } from '@tanstack/react-router';
import { ArchiveIcon } from 'lucide-react';
import type { SessionListItemProps } from '@/modules/sessions/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/utils/cn';
import { formatRelativeTime } from '@/shared/utils/relativeTime';

/** A Session in the left panel: its title and age, with an Archive button taking the age's place on hover or focus. */
export const SessionListItem = ({ session, now, onNavigate, onArchive }: SessionListItemProps) => {
  const { id } = useParams({ strict: false });
  const isActive = id === session.id;

  return (
    <li className="group relative">
      <Link
        to="/s/$id"
        params={{ id: session.id }}
        onClick={onNavigate}
        className={cn(
          'flex h-8 items-center gap-2 rounded-lg pr-1.5 pl-2 text-[13px] text-foreground-secondary hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
          isActive && 'bg-hover text-foreground',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{session.title}</span>
        <span className="font-mono text-[11px] text-faint group-focus-within:invisible group-hover:invisible">
          {formatRelativeTime(session.createdAt, now)}
        </span>
      </Link>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${resources.sessions.archive} ${session.title}`}
              className="absolute top-1/2 right-1 size-6 -translate-y-1/2 text-muted-foreground opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 [&_svg]:size-3.5"
              onClick={() => onArchive(session)}
            />
          }
        >
          <ArchiveIcon />
        </TooltipTrigger>
        <TooltipContent side="right">{resources.sessions.archive}</TooltipContent>
      </Tooltip>
    </li>
  );
};
