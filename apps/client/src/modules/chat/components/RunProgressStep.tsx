import { CircleDashedIcon } from 'lucide-react';
import type { RunProgressStepProps } from '@/modules/chat/types/types';
import { StepStatusIcon } from '@/modules/inspector/components/StepStatusIcon';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const { run: text } = resources.chat;

// The elbow joining a delegate to its turn; `mid` carries the rail on down to the next delegate.
const rail = {
  last: 'relative pl-[22px] before:absolute before:top-0 before:bottom-1/2 before:left-[7px] before:w-[9px] before:rounded-bl-[5px] before:border-b before:border-l before:border-border-strong',
  mid: 'after:absolute after:top-1/2 after:-bottom-px after:left-[7px] after:border-l after:border-border-strong',
};

/** One Step of a streaming Run: its state, the worker's label and the Agent running it. */
export const RunProgressStep = ({ step, isStreaming, child }: RunProgressStepProps) => {
  const { label, agent, phase, status } = step;

  return (
    <li
      className={cn(
        'flex h-[26px] items-center gap-2 text-[13px] text-foreground-secondary',
        status === 'running' && 'text-foreground',
        status === 'failed' && 'text-destructive',
        child && rail.last,
        child === 'mid' && rail.mid,
      )}
    >
      {/* A stream that ended leaves no Step running: one without an end was cut short. */}
      {status === 'running' && !isStreaming ? (
        <CircleDashedIcon
          role="img"
          aria-label={text.stepUnfinished}
          className="size-[15px] shrink-0 text-faint"
        />
      ) : (
        <StepStatusIcon status={status} />
      )}
      <span className="truncate">{label}</span>
      {phase !== 'intake' && <span className="font-mono text-[11px] text-faint">{agent}</span>}
      {status === 'failed' && (
        <span className="font-mono text-[11px] text-faint">{text.stepFailed}</span>
      )}
    </li>
  );
};
