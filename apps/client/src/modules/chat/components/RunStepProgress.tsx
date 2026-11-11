import { CircleDashedIcon, WorkflowIcon } from 'lucide-react';
import type { RunProgressProps } from '@/modules/chat/types/types';
import { StepStatusIcon } from '@/modules/inspector/components/StepStatusIcon';
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

/** A Run's Steps above its answer, as its stream reports them: one row each, in the order they started. */
export const RunStepProgress = ({ run, isStreaming = false }: RunProgressProps) => {
  const status = run.status ?? (isStreaming ? 'running' : null);

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
        <ul className="mt-2 border-t border-border pt-1.5">
          {run.steps.map(({ stepId, label, agent, phase, status: stepStatus }) => (
            <li
              key={stepId}
              className={cn(
                'flex h-[26px] items-center gap-2 text-[13px] text-foreground-secondary',
                stepStatus === 'running' && 'text-foreground',
                stepStatus === 'failed' && 'text-destructive',
              )}
            >
              {/* A stream that ended leaves no Step running: one without an end was cut short. */}
              {stepStatus === 'running' && !isStreaming ? (
                <CircleDashedIcon
                  role="img"
                  aria-label={text.stepUnfinished}
                  className="size-[15px] shrink-0 text-faint"
                />
              ) : (
                <StepStatusIcon status={stepStatus} />
              )}
              <span className="truncate">{label}</span>
              {phase !== 'intake' && (
                <span className="font-mono text-[11px] text-faint">{agent}</span>
              )}
              {stepStatus === 'failed' && (
                <span className="font-mono text-[11px] text-faint">{text.stepFailed}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
