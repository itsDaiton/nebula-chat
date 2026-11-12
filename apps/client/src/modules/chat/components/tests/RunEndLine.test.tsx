import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RunEndLine } from '@/modules/chat/components/RunEndLine';
import type { RunProgress, RunStepProgress } from '@/modules/chat/types/types';
import { resources } from '@/resources';

const { end } = resources.inspector.run;

const aStep = (
  phase: RunStepProgress['phase'],
  status: RunStepProgress['status'],
): RunStepProgress => ({ stepId: phase, attempt: 1, phase, agent: phase, label: phase, status });

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

  it('gives the general reason for a partial answer whose Intake went through', () => {
    expect(
      note({
        status: 'partial',
        steps: [aStep('intake', 'completed'), aStep('delegate', 'failed')],
      }),
    ).toHaveTextContent(`${end.partialTitle} ${end.partialFallback}`);
  });

  it('says the Run failed', () => {
    expect(note({ status: 'failed', steps: [] })).toHaveTextContent(
      `${end.failedTitle} ${end.failedFallback}`,
    );
  });

  it.each(['completed', 'cancelled', null] as const)(
    'says nothing for a Run that is %s',
    (status) => {
      expect(note({ status, steps: [] })).toBeNull();
    },
  );
});
