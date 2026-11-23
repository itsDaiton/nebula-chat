import { describe, expect, it } from 'vitest';
import { mapSavedRun } from '@/modules/chat/utils/mapSavedRun';
import { aRun, aStep } from '@/test/runs';

describe('mapSavedRun', () => {
  it('labels each Step by its Agent and keeps its turn, parent and attempt', () => {
    const { steps } = mapSavedRun(
      aRun({
        steps: [
          aStep('plan-1', 'orchestrator', 'orchestrator', 2, { turn: 1, attempt: 2 }),
          aStep('critic-1', 'delegate', 'critic', 3, {
            turn: 1,
            parentStepId: 'plan-1',
            status: 'failed',
          }),
        ],
      }),
    );

    expect(steps).toEqual([
      {
        stepId: 'plan-1',
        attempt: 2,
        phase: 'orchestrator',
        agent: 'orchestrator',
        label: 'Planning the work',
        status: 'completed',
        turn: 1,
        parentStepId: null,
      },
      {
        stepId: 'critic-1',
        attempt: 1,
        phase: 'delegate',
        agent: 'critic',
        label: 'Reviewing',
        status: 'failed',
        turn: 1,
        parentStepId: 'plan-1',
      },
    ]);
  });

  it('shows an unknown Agent under its own name', () => {
    expect(
      mapSavedRun(aRun({ steps: [aStep('s', 'tool', 'mystery_tool', 1)] })).steps[0]?.label,
    ).toBe('mystery_tool');
  });

  it.each(['completed', 'partial', 'failed', 'cancelled'] as const)('ends as %s', (status) => {
    expect(mapSavedRun(aRun({ status })).status).toBe(status);
  });

  it.each(['queued', 'running', 'waiting'] as const)('has no end while %s', (status) => {
    expect(mapSavedRun(aRun({ status })).status).toBeNull();
  });
});
