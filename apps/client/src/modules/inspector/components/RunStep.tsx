import { RunStepDetail } from '@/modules/inspector/components/RunStepDetail';
import { StepStatusIcon } from '@/modules/inspector/components/StepStatusIcon';
import type { RunStepProps } from '@/modules/inspector/types/types';
import { formatDuration, runDurationMs } from '@/modules/inspector/utils/formatDuration';
import { stepLabel } from '@/modules/inspector/utils/stepLabel';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';

/** One Step's row; selecting it opens its detail underneath. */
export const RunStep = ({ step, depth }: RunStepProps) => {
  const label = stepLabel(step.name);
  const { name, phase, status } = step;
  // Intake and the Orchestrator are named by their label alone; a delegate, tool or the Output Agent shows which one ran.
  const showsName = phase !== 'intake' && phase !== 'orchestrator' && label !== name;
  const duration = runDurationMs(step);

  return (
    <Collapsible render={<li />} style={{ marginLeft: depth * 14 }}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-foreground-secondary outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 data-panel-open:bg-hover data-panel-open:text-foreground">
        <StepStatusIcon status={status} />
        <span className="min-w-0 flex-1 truncate">
          {label}
          {showsName && <span className="ml-1.5 font-mono text-[10.5px] text-faint">{name}</span>}
        </span>
        {duration !== null && (
          <span className="font-mono text-[10.5px] text-faint tabular-nums">
            {formatDuration(duration)}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <RunStepDetail step={step} />
      </CollapsibleContent>
    </Collapsible>
  );
};
