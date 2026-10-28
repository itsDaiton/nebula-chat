import { MessageSquareIcon } from 'lucide-react';
import { useSearchSessions } from '@/libs/api/generated/sessions/sessions';
import { HighlightedText } from '@/modules/commandPalette/components/HighlightedText';
import { useSessions } from '@/modules/sessions/hooks/useSessions';
import { useCommandPaletteStore } from '@/modules/commandPalette/stores/useCommandPaletteStore';
import type { PaletteSessionsGroupProps } from '@/modules/commandPalette/types/types';
import { resources } from '@/resources';
import { CommandGroup, CommandItem } from '@/shared/components/ui/command';
import { groupClass, itemClass } from '@/modules/commandPalette/utils/paletteClasses';
import { useNow } from '@/shared/hooks/useNow';
import { formatRelativeTime } from '@/shared/utils/relativeTime';

const RECENT_COUNT = 5;

/** Recent Sessions while nothing is typed; otherwise the API's search results for the debounced text. */
export const PaletteSessionsGroup = ({ onSelect }: PaletteSessionsGroupProps) => {
  const { query, debouncedQuery } = useCommandPaletteStore();
  const { sessions: recent } = useSessions();
  const now = useNow();
  const text = debouncedQuery.trim();
  const { data: found = [] } = useSearchSessions(
    { q: text },
    { query: { enabled: Boolean(text) } },
  );

  // Until the debounce settles, the previous results would answer the wrong text.
  const isSettled = query.trim() === text;
  let sessions = isSettled ? found : [];
  if (!query.trim()) sessions = recent.slice(0, RECENT_COUNT);

  if (sessions.length === 0) return null;

  return (
    <CommandGroup heading={resources.commandPalette.sessions} className={groupClass}>
      {sessions.map((session) => (
        <CommandItem
          key={session.id}
          value={`session:${session.id}`}
          onSelect={() => onSelect(session.id)}
          className={itemClass}
        >
          <MessageSquareIcon />
          <span className="min-w-0 flex-1 truncate">
            <HighlightedText text={session.title} query={query} />
          </span>
          <span className="font-mono text-[11px] text-faint">
            {formatRelativeTime(session.createdAt, now)}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
};
