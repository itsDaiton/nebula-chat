import { ChevronRightIcon, WorkflowIcon } from 'lucide-react';
import type { RunStatus } from '@/libs/api/generated/model/runStatus';
import type { RunChipProps } from '@/modules/chat/types/types';
import { useRun } from '@/modules/inspector/hooks/useRun';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import { formatDuration, runDurationMs } from '@/modules/inspector/utils/formatDuration';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const { meta } = resources.chat;
const { run: text } = resources.inspector;

const tone: Partial<Record<RunStatus, string>> = {
  completed: 'text-success',
  partial: 'text-warning',
  failed: 'text-destructive',
  cancelled: 'text-muted-foreground',
};

/** The entry point to a Run under the answer it produced: selecting it opens the Inspector's Run tab on that Run. */
export const RunChip = ({ runId }: RunChipProps) => {
  const { data: run } = useRun(runId);
  const { activeTab, selectedRunId, openInspector } = useInspectorStore();
  const isSelected = activeTab === 'run' && selectedRunId === runId;
  const duration = run ? runDurationMs(run) : null;

  return (
    <button
      type="button"
      title={meta.openRun}
      aria-pressed={isSelected}
      onClick={() => openInspector('run', runId)}
      className={cn(
        'mt-2 mb-2 flex h-7 w-fit items-center gap-2 rounded-lg border border-border-strong bg-panel pr-2 pl-2.5 text-xs text-foreground-secondary outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50',
        isSelected && 'border-foreground',
      )}
    >
      <WorkflowIcon className="size-[13px]" />
      <span>{meta.run}</span>
      {run && (
        <>
          <span className={cn('flex items-center gap-1.5', tone[run.status])}>
            <span className="size-1.5 rounded-full bg-current" />
            {text.status[run.status]}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {[
              text.steps(run.steps.length),
              ...(duration === null ? [] : [formatDuration(duration)]),
            ].join(' · ')}
          </span>
        </>
      )}
      <ChevronRightIcon className="size-[13px] text-faint" />
    </button>
  );
};
