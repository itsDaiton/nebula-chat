import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RunStepProgress } from '@/modules/chat/components/RunStepProgress';
import type { RunProgress } from '@/modules/chat/types/types';
import { resources } from '@/resources';

const { run: text } = resources.chat;

const aRun = (status: RunProgress['status']): RunProgress => ({
  status,
  steps: [
    {
      stepId: 's1',
      attempt: 1,
      phase: 'intake',
      agent: 'language',
      label: 'Detecting the language',
      status: 'completed',
    },
    {
      stepId: 's2',
      attempt: 1,
      phase: 'delegate',
      agent: 'analyst',
      label: 'Analysing',
      status: 'running',
    },
  ],
});

const stepStates = () =>
  screen
    .getAllByRole('listitem')
    .map((row) => within(row).getByRole('img').getAttribute('aria-label'));

describe('RunStepProgress', () => {
  it('shows a Step without an end as running while the Run streams', () => {
    render(<RunStepProgress run={aRun(null)} isStreaming />);

    expect(stepStates()).toEqual(['Completed', 'Running']);
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('analyst')).toBeInTheDocument();
    expect(screen.queryByText('language')).not.toBeInTheDocument();
  });

  it('shows a Step cut short by a cancelled Run as not finished, under the end status', () => {
    render(<RunStepProgress run={aRun('cancelled')} />);

    expect(stepStates()).toEqual(['Completed', text.stepUnfinished]);
    expect(screen.getByText('cancelled')).toBeInTheDocument();
  });

  it('names no status for a Run whose stream ended without one', () => {
    render(<RunStepProgress run={aRun(null)} />);

    expect(screen.queryByText('running')).not.toBeInTheDocument();
  });
});
