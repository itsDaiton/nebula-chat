import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGetRunMockHandler } from '@/libs/api/generated/runs/runs.msw';
import { RunCard } from '@/modules/chat/components/RunCard';
import { useRunCardStore } from '@/modules/chat/stores/useRunCardStore';
import type {
  RunCardProps,
  RunProgress,
  RunStepProgress as Step,
} from '@/modules/chat/types/types';
import { useInspectorStore } from '@/modules/inspector/stores/useInspectorStore';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';
import { aRun as aSavedRun, aStep as aSavedStep, RUN_ID } from '@/test/runs';

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

const renderCard = (props: Omit<RunCardProps, 'runId'> = {}) =>
  renderWithProviders(<RunCard runId={RUN_ID} {...props} />);

const toggle = () => screen.findByRole('button', { name: /Show Steps|Hide Steps/ });

beforeEach(() => {
  usePanelStore.setState({ rightOpen: false, sheetOpen: false });
  useInspectorStore.setState({ selectedRunId: null });
  useRunCardStore.setState({ expanded: {} });
  server.use(getGetRunMockHandler(aSavedRun()));
});

describe('RunCard', () => {
  it('shows a Step without an end as running while the Run streams', () => {
    renderCard({ live: aRun(null), isStreaming: true });

    expect(stepStates()).toEqual(['Completed', 'Running']);
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('analyst')).toBeInTheDocument();
    expect(screen.queryByText('language')).not.toBeInTheDocument();
  });

  it('shows a Step cut short by a cancelled Run as not finished, under the end status', async () => {
    renderCard({ live: aRun('cancelled') });
    await userEvent.click(await toggle());

    expect(stepStates()).toEqual(['Completed', text.stepUnfinished]);
    expect(screen.getByText('cancelled')).toBeInTheDocument();
  });

  it('names no status for a Run whose stream ended without one', () => {
    renderCard({ live: aRun(null) });

    expect(screen.queryByText('running')).not.toBeInTheDocument();
  });

  it('groups an orchestrated Run by Intake, then each turn with its delegates', () => {
    renderCard({ live: anOrchestratedRun(), isStreaming: true });

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
    renderCard({ live: anOrchestratedRun(), isStreaming: true });

    expect(rowsOf('Turn 2')).toEqual([
      'Planning the workplan-2: Completed',
      'Analysinganalyst-2: Running',
      `Reviewingcritic-2${text.stepFailed}: Failed`,
    ]);
  });

  it('marks Intake Steps as running in parallel', () => {
    renderCard({ live: anOrchestratedRun(), isStreaming: true });

    expect(
      within(screen.getByRole('group', { name: 'Intake' })).getByText(text.parallel),
    ).toBeInTheDocument();
  });

  it('lists a Run with no Orchestrator turns flat, under no group', async () => {
    const steps = [
      aStep('language', 'intake', 'Detecting the language'),
      aStep('output', 'output', 'Writing the answer'),
    ];
    renderCard({ live: { status: 'completed', steps } });
    await userEvent.click(await toggle());

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('draws a saved Run collapsed to its status, Step count and duration', async () => {
    renderCard();

    const card = await screen.findByRole('button', { name: /^Run\s*partial\s*9 Steps · 41\.2s$/ });
    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('expands a saved Run in place from the chevron, without selecting it', async () => {
    renderCard();
    await userEvent.click(await toggle());

    expect(rowsOf('Turn 2')).toEqual([
      'Planning the workorchestrator: Completed',
      'Analysinganalyst: Completed',
      `Reviewingcritic${text.stepFailed}: Failed`,
    ]);
    expect(screen.getByRole('note')).toHaveTextContent(
      'Partial answer. Reviewing (critic) failed in turn 2',
    );
    expect(useInspectorStore.getState().selectedRunId).toBeNull();

    await userEvent.click(await toggle());

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('lists the Steps of a saved Run labelled and grouped, a retried one once', async () => {
    server.use(
      getGetRunMockHandler(
        aSavedRun({
          status: 'completed',
          steps: [
            aSavedStep('language', 'intake', 'language', 1),
            aSavedStep('plan-1', 'orchestrator', 'orchestrator', 2, { turn: 1, attempt: 2 }),
          ],
        }),
      ),
    );
    renderCard();
    await userEvent.click(await toggle());

    expect(rowsOf('Intake')).toEqual(['Detecting the language: Completed']);
    expect(rowsOf('Turn 1')).toEqual(['Planning the workorchestrator: Completed']);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('opens the Inspector on the Run from the collapsed card', async () => {
    renderCard();
    await userEvent.click(await screen.findByRole('button', { name: /^Run/ }));

    expect(useInspectorStore.getState().selectedRunId).toBe(RUN_ID);
    expect(usePanelStore.getState().rightOpen).toBe(true);
    expect(await screen.findByRole('button', { name: /^Run/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('is open while the Run streams and collapses once it ends', () => {
    const { rerender } = renderCard({ live: aRun(null), isStreaming: true });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    rerender(<RunCard runId={RUN_ID} live={aRun('completed')} />);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('keeps a choice the User made while the Run streams', async () => {
    const { rerender } = renderCard({ live: aRun(null), isStreaming: true });
    await userEvent.click(await toggle());
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);

    rerender(<RunCard runId={RUN_ID} live={aRun(null)} isStreaming />);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('shows a cancelled Run with no Steps as its card and the reason it stopped', async () => {
    renderCard({ live: { status: 'cancelled', steps: [] } });
    await userEvent.click(await toggle());

    expect(screen.getByText('cancelled')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(resources.inspector.run.end.cancelledReason);
  });

  it('still opens the Inspector when the Run could not be loaded', async () => {
    server.use(mockApiError('get', API_ROUTE.run, 500));
    renderCard();

    await userEvent.click(await screen.findByRole('button', { name: 'Run' }));

    expect(useInspectorStore.getState().selectedRunId).toBe(RUN_ID);
  });
});
