import { RunProgressStep } from '@/modules/chat/components/RunProgressStep';
import type { RunProgressGroupProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';

const { groups } = resources.inspector.run;

/** Intake, one Orchestrator turn or the answer: a turn's delegates hang off its Step, side by side. */
export const RunProgressGroup = ({ group, isStreaming }: RunProgressGroupProps) => {
  const { kind, turn, rows } = group;
  const title = kind === 'turn' ? groups.turn(turn) : groups[kind];

  return (
    <div role="group" aria-label={title} className="pt-1 pb-0.5">
      <h4 className="flex items-center gap-1.5 pt-1 pb-0.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-faint uppercase">
        {title}
        {kind === 'intake' && rows.length > 1 && (
          <span className="rounded border border-dashed border-border-strong px-1 text-[10px] font-normal tracking-normal">
            {resources.chat.run.parallel}
          </span>
        )}
      </h4>
      <ul>
        {rows.map(({ step, depth }, index) => {
          const hasSibling = (rows[index + 1]?.depth ?? 0) > 0;
          return (
            <RunProgressStep
              key={step.stepId}
              step={step}
              isStreaming={isStreaming}
              child={depth === 0 ? undefined : hasSibling ? 'mid' : 'last'}
            />
          );
        })}
      </ul>
    </div>
  );
};
