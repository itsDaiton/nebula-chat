import type { RunProgressGroup, RunProgressRow, RunStepProgress } from '@/modules/chat/types/types';

const kindOf = ({ phase }: RunStepProgress): RunProgressGroup['kind'] =>
  phase === 'intake' || phase === 'output' ? phase : 'turn';

// Intake first, the turns in order, the answer last.
const rankOf = ({ kind, turn }: RunProgressGroup) =>
  kind === 'intake' ? -1 : kind === 'output' ? Infinity : turn;

// A Step whose parent has not arrived yet is listed at the top level until it does.
const toRows = (steps: RunStepProgress[]): RunProgressRow[] => {
  const ids = new Set(steps.map(({ stepId }) => stepId));
  const childrenOf = (parentId: string | null, depth: number): RunProgressRow[] =>
    steps
      .filter(({ parentStepId }) =>
        parentId === null
          ? parentStepId === null || !ids.has(parentStepId)
          : parentStepId === parentId,
      )
      .flatMap((step) => [{ step, depth }, ...childrenOf(step.stepId, depth + 1)]);
  return childrenOf(null, 0);
};

/** A Run's streamed Steps as the chat lists them: Intake, each Orchestrator turn with its delegates, then the answer. */
export const groupProgressSteps = (steps: RunStepProgress[]): RunProgressGroup[] => {
  const byKey = new Map<string, RunStepProgress[]>();
  for (const step of steps) {
    const kind = kindOf(step);
    const key = kind === 'turn' ? `turn-${step.turn}` : kind;
    byKey.set(key, [...(byKey.get(key) ?? []), step]);
  }
  return [...byKey.entries()]
    .map(([key, members]) => ({
      key,
      kind: kindOf(members[0]!),
      turn: members[0]!.turn,
      rows: toRows(members),
    }))
    .sort((a, b) => rankOf(a) - rankOf(b));
};
