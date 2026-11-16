import { RunStep } from '@/modules/inspector/components/RunStep';
import type { RunStepGroupProps } from '@/modules/inspector/types/types';
import { resources } from '@/resources';

const { groups } = resources.inspector.run;

/** A phase or Orchestrator turn: its Steps hang off one rail, and Steps that ran side by side are counted. */
export const RunStepGroup = ({ group }: RunStepGroupProps) => {
  const { kind, turn, parallel, rows } = group;
  const title = kind === 'turn' ? groups.turn(turn) : groups[kind];

  return (
    <section aria-label={title}>
      <h3 className="flex items-center justify-between gap-2 px-0.5 pt-1 pb-0.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-faint uppercase">
        <span>{title}</span>
        {parallel > 0 && (
          <span className="tracking-normal normal-case">{groups.parallel(parallel)}</span>
        )}
      </h3>
      <ul className="ml-1.5 flex flex-col gap-0.5 border-l border-border-strong pl-3">
        {rows.map(({ step, depth }) => (
          <RunStep key={step.id} step={step} depth={depth} />
        ))}
      </ul>
    </section>
  );
};
