import { XIcon } from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useGetSession } from '@/libs/api/generated/sessions/sessions';
import { useRunMode } from '@/modules/chat/hooks/useRunMode';
import { RunSessionHeader } from '@/modules/inspector/components/RunSessionHeader';
import { RunTab } from '@/modules/inspector/components/RunTab';
import { SessionTab } from '@/modules/inspector/components/SessionTab';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import type { InspectorProps } from '@/modules/inspector/types/types';
import { resources } from '@/resources';
import { IconButton } from '@/shared/components/ui/icon-button';

const { views } = resources.inspector;

// One view per Reply mode (ADR-0035): a Run Session shows its Run, a Direct one the Session.
export const Inspector = ({ onClose }: InspectorProps) => {
  const { id } = useParams({ strict: false });
  const selectedRunId = useInspectorStore((state) => state.selectedRunId);
  const { isRunMode } = useRunMode();
  const { data: session } = useGetSession(id ?? '', { query: { enabled: Boolean(id) } });
  // A Session on screen decides by its own mode; a new chat follows the toggle.
  const isRun = id ? session?.replyMode === 'run' : isRunMode;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 items-center justify-between border-b border-border pr-2 pl-3.5">
        <h2 className="text-[12.5px] font-medium text-foreground">
          {isRun ? views.run : views.session}
        </h2>
        <IconButton
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          label={resources.inspector.close}
          onClick={onClose}
        >
          <XIcon />
        </IconButton>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {isRun ? (
          <>
            {id && <RunSessionHeader />}
            <RunTab runId={selectedRunId} />
          </>
        ) : (
          (!id || session) && <SessionTab />
        )}
      </div>
    </div>
  );
};
