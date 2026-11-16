import { describe, expect, it } from 'vitest';
import type { RunStepProgress } from '@/modules/chat/types/types';
import { groupProgressSteps } from '@/modules/chat/utils/groupProgressSteps';

const aStep = (
  stepId: string,
  phase: RunStepProgress['phase'],
  turn = 0,
  parentStepId: string | null = null,
): RunStepProgress => ({
  stepId,
  attempt: 1,
  phase,
  agent: stepId,
  label: stepId,
  status: 'completed',
  turn,
  parentStepId,
});

const shape = (steps: RunStepProgress[]) =>
  groupProgressSteps(steps).map(({ kind, turn, rows }) => [
    kind === 'turn' ? `turn ${turn}` : kind,
    rows.map(({ step, depth }) => `${'> '.repeat(depth)}${step.stepId}`),
  ]);

describe('groupProgressSteps', () => {
  it('lists Intake, then each turn with its delegates under it, then the answer', () => {
    expect(
      shape([
        aStep('language', 'intake'),
        aStep('session', 'intake'),
        aStep('plan-1', 'orchestrator', 1),
        aStep('analyst-1', 'delegate', 1, 'plan-1'),
        aStep('critic-1', 'delegate', 1, 'plan-1'),
        aStep('plan-2', 'orchestrator', 2),
        aStep('critic-2', 'delegate', 2, 'plan-2'),
        aStep('output', 'output'),
      ]),
    ).toEqual([
      ['intake', ['language', 'session']],
      ['turn 1', ['plan-1', '> analyst-1', '> critic-1']],
      ['turn 2', ['plan-2', '> critic-2']],
      ['output', ['output']],
    ]);
  });

  it('orders the groups by phase and turn, whatever order the Steps arrived in', () => {
    expect(
      shape([
        aStep('output', 'output'),
        aStep('plan-2', 'orchestrator', 2),
        aStep('plan-1', 'orchestrator', 1),
        aStep('language', 'intake'),
      ]),
    ).toEqual([
      ['intake', ['language']],
      ['turn 1', ['plan-1']],
      ['turn 2', ['plan-2']],
      ['output', ['output']],
    ]);
  });

  it('keeps a delegate whose turn Step is not known yet, ungrouped in its turn', () => {
    expect(shape([aStep('analyst-1', 'delegate', 1, 'plan-1')])).toEqual([
      ['turn 1', ['analyst-1']],
    ]);
  });

  it('moves that delegate under its turn Step once it arrives', () => {
    expect(
      shape([aStep('analyst-1', 'delegate', 1, 'plan-1'), aStep('plan-1', 'orchestrator', 1)]),
    ).toEqual([['turn 1', ['plan-1', '> analyst-1']]]);
  });
});
