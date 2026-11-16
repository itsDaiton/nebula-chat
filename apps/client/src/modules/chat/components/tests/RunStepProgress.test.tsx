import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RunStepProgress } from '@/modules/chat/components/RunStepProgress';
import type { RunProgress, RunStepProgress as Step } from '@/modules/chat/types/types';
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
      turn: 0,
      parentStepId: null,
    },
    {
      stepId: 's2',
      attempt: 1,
      phase: 'delegate',
      agent: 'analyst',
      label: 'Analysing',
      status: 'running',
      turn: 1,
      parentStepId: 'plan-1',
    },
  ],
});

const aStep = (
  stepId: string,
  phase: Step['phase'],
  label: string,
  over: Partial<Step> = {},
): Step => ({
  stepId,
  attempt: 1,
  phase,
  agent: stepId,
  label,
  status: 'completed',
  turn: 0,
  parentStepId: null,
  ...over,
});

const anOrchestratedRun = (): RunProgress => ({
  status: null,
  steps: [
    aStep('language', 'intake', 'Detecting the language'),
    aStep('session', 'intake', 'Summarising the Session'),
    aStep('plan-1', 'orchestrator', 'Planning the work', { turn: 1 }),
    aStep('analyst-1', 'delegate', 'Analysing', { turn: 1, parentStepId: 'plan-1' }),
    aStep('critic-1', 'delegate', 'Reviewing', { turn: 1, parentStepId: 'plan-1' }),
    aStep('plan-2', 'orchestrator', 'Planning the work', { turn: 2 }),
    aStep('analyst-2', 'delegate', 'Analysing', {
      turn: 2,
      parentStepId: 'plan-2',
      status: 'running',
    }),
    aStep('critic-2', 'delegate', 'Reviewing', {
      turn: 2,
      parentStepId: 'plan-2',
      status: 'failed',
    }),
  ],
});

const rowsOf = (group: string) =>
  within(screen.getByRole('group', { name: group }))
    .getAllByRole('listitem')
    .map((row) => `${row.textContent}: ${within(row).getByRole('img').getAttribute('aria-label')}`);

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

  it('groups an orchestrated Run by Intake, then each turn with its delegates', () => {
    render(<RunStepProgress run={anOrchestratedRun()} isStreaming />);

    expect(screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'))).toEqual([
      'Intake',
      'Turn 1',
      'Turn 2',
    ]);
    expect(rowsOf('Intake')).toEqual([
      'Detecting the language: Completed',
      'Summarising the Session: Completed',
    ]);
    expect(rowsOf('Turn 1')).toEqual([
      'Planning the workplan-1: Completed',
      'Analysinganalyst-1: Completed',
      'Reviewingcritic-1: Completed',
    ]);
  });

  it('shows a failed delegate beside one still running in the same turn', () => {
    render(<RunStepProgress run={anOrchestratedRun()} isStreaming />);

    expect(rowsOf('Turn 2')).toEqual([
      'Planning the workplan-2: Completed',
      'Analysinganalyst-2: Running',
      `Reviewingcritic-2${text.stepFailed}: Failed`,
    ]);
  });

  it('marks Intake Steps as running in parallel', () => {
    render(<RunStepProgress run={anOrchestratedRun()} isStreaming />);

    expect(
      within(screen.getByRole('group', { name: 'Intake' })).getByText(text.parallel),
    ).toBeInTheDocument();
  });

  it('lists a Run with no Orchestrator turns flat, under no group', () => {
    const steps = [
      aStep('language', 'intake', 'Detecting the language'),
      aStep('output', 'output', 'Writing the answer'),
    ];
    render(<RunStepProgress run={{ status: 'completed', steps }} />);

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
