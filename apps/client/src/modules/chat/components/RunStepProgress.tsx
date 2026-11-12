import { WorkflowIcon } from 'lucide-react';
import { RunProgressGroup } from '@/modules/chat/components/RunProgressGroup';
import { RunProgressStep } from '@/modules/chat/components/RunProgressStep';
import type { RunProgressProps } from '@/modules/chat/types/types';
import { groupProgressSteps } from '@/modules/chat/utils/groupProgressSteps';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const { run: text, meta } = resources.chat;
const { status: statusText } = resources.inspector.run;

const tone = {
  running: 'text-muted-foreground',
  completed: 'text-success',
  partial: 'text-warning',
  failed: 'text-destructive',
  cancelled: 'text-muted-foreground',
};

/** A Run's Steps above its answer, as its stream reports them: grouped by Orchestrator turn once it has one. */
export const RunStepProgress = ({ run, isStreaming = false }: RunProgressProps) => {
  const status = run.status ?? (isStreaming ? 'running' : null);
  const groups = groupProgressSteps(run.steps);
  // A Run with no Orchestrator turn keeps the flat list it had before turns existed.
  const hasTurns = groups.some(({ kind }) => kind === 'turn');

  return (
    <section
      aria-label={text.progress}
      className="mb-4 rounded-xl border border-border bg-panel px-3 py-2.5"
    >
      <h3 className="flex items-center gap-2 text-[12.5px] text-foreground-secondary">
        <WorkflowIcon className="size-3.5" />
        {meta.run}
        {status && (
          <span className={cn('font-mono text-[11px]', tone[status])}>{statusText[status]}</span>
        )}
      </h3>
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
    </section>
  );
};
