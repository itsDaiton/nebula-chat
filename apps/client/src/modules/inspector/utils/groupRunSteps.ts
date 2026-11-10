import type { Step } from '@/libs/api/generated/model/step';
import type { RunStepGroup, RunStepRow } from '@/modules/inspector/types/types';

// Intake Agents and a turn's Delegate Agents run side by side; tool calls and everything else run in sequence.
const runsInParallel = ({ phase }: Step) => phase === 'intake' || phase === 'delegate';

const groupKeyOf = ({ phase, turn }: Step) =>
  phase === 'intake' || phase === 'output' ? phase : `turn-${turn}`;

const toRows = (steps: Step[]): RunStepRow[] => {
  const ids = new Set(steps.map(({ id }) => id));
  const childrenOf = (parentId: string | null, depth: number): RunStepRow[] =>
    steps
      .filter(({ parentStepId }) =>
        parentId === null
          ? parentStepId === null || !ids.has(parentStepId)
          : parentStepId === parentId,
      )
      .flatMap((step) => [{ step, depth }, ...childrenOf(step.id, depth + 1)]);
  return childrenOf(null, 0);
};

/** A Run's Steps as the view lists them: Intake, each Orchestrator turn, then the answer, children under their parent. */
export const groupRunSteps = (steps: Step[]): RunStepGroup[] => {
  const byKey = new Map<string, Step[]>();
  for (const step of steps) {
    const key = groupKeyOf(step);
    byKey.set(key, [...(byKey.get(key) ?? []), step]);
  }
  return [...byKey.entries()].map(([key, members]) => {
    const first = members[0]!;
    const parallel = members.filter(runsInParallel).length;
    return {
      key,
      kind: first.phase === 'intake' || first.phase === 'output' ? first.phase : 'turn',
      turn: first.turn,
      parallel: parallel > 1 ? parallel : 0,
      rows: toRows(members),
    };
  });
};
