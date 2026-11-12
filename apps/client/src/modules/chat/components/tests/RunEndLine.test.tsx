import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RunEndLine } from '@/modules/chat/components/RunEndLine';
import type { RunProgress, RunStepProgress } from '@/modules/chat/types/types';
import { resources } from '@/resources';

const { end } = resources.inspector.run;

const aStep = (
  phase: RunStepProgress['phase'],
  status: RunStepProgress['status'],
  turn = 0,
): RunStepProgress => ({
  stepId: phase,
  attempt: 1,
  phase,
  agent: phase,
  label: phase,
  status,
  turn,
  parentStepId: null,
});

const note = (run: RunProgress) => {
  render(<RunEndLine run={run} />);
  return screen.queryByRole('note');
};

describe('RunEndLine', () => {
  it('says an Intake Agent failed under a partial answer', () => {
    expect(note({ status: 'partial', steps: [aStep('intake', 'failed')] })).toHaveTextContent(
      `${end.partialTitle} ${resources.chat.run.intakeFailed}`,
    );
  });

  it('names the delegate that failed, and its turn, under a partial answer', () => {
    expect(
      note({
        status: 'partial',
        steps: [
          aStep('intake', 'completed'),
          { ...aStep('delegate', 'failed', 2), agent: 'critic', label: 'Reviewing' },
        ],
      }),
    ).toHaveTextContent(
      'Partial answer. Reviewing (critic) failed in turn 2, so the answer was written without it.',
    );
  });

  it('gives the general reason for a partial answer in which no Step failed', () => {
    expect(note({ status: 'partial', steps: [aStep('intake', 'completed')] })).toHaveTextContent(
      `${end.partialTitle} ${end.partialFallback}`,
    );
  });

  it('says a stopped Run was cancelled, and what it kept', () => {
    expect(note({ status: 'cancelled', steps: [] })).toHaveTextContent(
      'Run cancelled. It was stopped before it finished. The Steps it had completed are kept.',
    );
  });

  it('says the Run failed', () => {
    expect(note({ status: 'failed', steps: [] })).toHaveTextContent(
      `${end.failedTitle} ${end.failedFallback}`,
    );
  });

  it.each(['completed', null] as const)('says nothing for a Run that is %s', (status) => {
    expect(note({ status, steps: [] })).toBeNull();
  });
});
