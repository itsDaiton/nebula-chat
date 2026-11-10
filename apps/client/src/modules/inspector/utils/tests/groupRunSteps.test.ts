import { describe, expect, it } from 'vitest';
import type { Step } from '@/libs/api/generated/model/step';
import { groupRunSteps } from '@/modules/inspector/utils/groupRunSteps';

const step = (id: string, phase: Step['phase'], turn = 0, parentStepId: string | null = null) =>
  ({ id, phase, turn, parentStepId }) as Step;

const shape = (steps: Step[]) =>
  groupRunSteps(steps).map(({ kind, turn, parallel, rows }) => ({
    kind,
    turn,
    parallel,
    rows: rows.map(({ step: { id }, depth }) => `${'>'.repeat(depth)}${id}`),
  }));

describe('groupRunSteps', () => {
  it('groups by Intake, each Orchestrator turn and the answer, in execution order', () => {
    expect(
      shape([
        step('language', 'intake'),
        step('session', 'intake'),
        step('plan-1', 'orchestrator', 1),
        step('analyst-1', 'delegate', 1, 'plan-1'),
        step('plan-2', 'orchestrator', 2),
        step('output', 'output'),
      ]),
    ).toEqual([
      { kind: 'intake', turn: 0, parallel: 2, rows: ['language', 'session'] },
      { kind: 'turn', turn: 1, parallel: 0, rows: ['plan-1', '>analyst-1'] },
      { kind: 'turn', turn: 2, parallel: 0, rows: ['plan-2'] },
      { kind: 'output', turn: 0, parallel: 0, rows: ['output'] },
    ]);
  });

  it('nests delegates under their turn and tool calls under their delegate, however they interleave', () => {
    expect(
      shape([
        step('plan', 'orchestrator', 1),
        step('analyst', 'delegate', 1, 'plan'),
        step('researcher', 'delegate', 1, 'plan'),
        step('search', 'tool', 1, 'researcher'),
        step('fetch', 'tool', 1, 'researcher'),
      ]),
    ).toEqual([
      {
        kind: 'turn',
        turn: 1,
        parallel: 2,
        rows: ['plan', '>analyst', '>researcher', '>>search', '>>fetch'],
      },
    ]);
  });

  it('keeps a Step whose parent is not in the Run at the top of its group', () => {
    expect(shape([step('orphan', 'delegate', 3, 'gone')])).toEqual([
      { kind: 'turn', turn: 3, parallel: 0, rows: ['orphan'] },
    ]);
  });
});
