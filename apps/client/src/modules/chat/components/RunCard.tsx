import { ChevronDownIcon, ChevronRightIcon, WorkflowIcon } from 'lucide-react';
import { RunEndNote } from '@/modules/chat/components/RunEndNote';
import { RunProgressGroup } from '@/modules/chat/components/RunProgressGroup';
import { RunProgressStep } from '@/modules/chat/components/RunProgressStep';
import { useRunCardStore } from '@/modules/chat/stores/useRunCardStore';
import type { RunCardProps } from '@/modules/chat/types/types';
import { groupProgressSteps } from '@/modules/chat/utils/groupProgressSteps';
import { mapSavedRun } from '@/modules/chat/utils/mapSavedRun';
import { useRun } from '@/modules/inspector/hooks/useRun';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import { formatDuration, runDurationMs } from '@/modules/inspector/utils/formatDuration';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const { run: text, meta } = resources.chat;
const { status: statusText, steps: stepsText } = resources.inspector.run;

const tone = {
  running: 'text-muted-foreground',
  completed: 'text-success',
  partial: 'text-warning',
  failed: 'text-destructive',
  cancelled: 'text-muted-foreground',
};

/** A Run's one card above its answer: Steps open while it streams, one selectable line once it ended. */
export const RunCard = ({ runId, live, isStreaming = false }: RunCardProps) => {
  const { data: saved } = useRun(runId);
  const { selectedRunId, selectRun } = useInspectorStore();
  const choice = useRunCardStore((state) => state.expanded[runId]);
  const setExpanded = useRunCardStore((state) => state.setExpanded);

  const run = live ?? (saved ? mapSavedRun(saved) : null);
  const isExpanded = choice ?? isStreaming;
  const status = run?.status ?? (isStreaming ? 'running' : null);
  const duration = saved ? runDurationMs(saved) : null;
  const groups = groupProgressSteps(run?.steps ?? []);
  // A Run with no Orchestrator turn keeps the flat list it had before turns existed.
  const hasTurns = groups.some(({ kind }) => kind === 'turn');
  const summary = [
    ...(run && !isStreaming ? [stepsText(run.steps.length)] : []),
    ...(duration === null || isStreaming ? [] : [formatDuration(duration)]),
  ].join(' · ');

  return (
    <section
      aria-label={text.progress}
      className={cn(
        'mb-4 rounded-xl border border-border bg-panel px-3 py-2.5',
        selectedRunId === runId && 'border-border-strong',
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          title={meta.openRun}
          aria-pressed={selectedRunId === runId}
          onClick={() => selectRun(runId)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left text-[12.5px] text-foreground-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <WorkflowIcon className="size-3.5 shrink-0" />
          {meta.run}
          {status && (
            <span className={cn('font-mono text-[11px]', tone[status])}>{statusText[status]}</span>
          )}
          {summary && (
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {summary}
            </span>
          )}
        </button>
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? text.collapse : text.expand}
          onClick={() => setExpanded(runId, !isExpanded)}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-faint outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {isExpanded ? (
            <ChevronDownIcon className="size-3.5" />
          ) : (
            <ChevronRightIcon className="size-3.5" />
          )}
        </button>
      </div>
      {isExpanded && run && (
        <>
          {run.steps.length > 0 && (
            <div className="mt-2 border-t border-border pt-1.5">
              {hasTurns ? (
                groups.map((group) => (
                  <RunProgressGroup key={group.key} group={group} isStreaming={isStreaming} />
                ))
              ) : (
                <ul>
                  {run.steps.map((step) => (
                    <RunProgressStep key={step.stepId} step={step} isStreaming={isStreaming} />
                  ))}
                </ul>
              )}
            </div>
          )}
          <RunEndNote run={run} />
        </>
      )}
    </section>
  );
};
