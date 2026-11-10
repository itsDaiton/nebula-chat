import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { getGetRunMockHandler } from '@/libs/api/generated/runs/runs.msw';
import { RunTab } from '@/modules/inspector/components/RunTab';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';
import { aRun, aStep, RUN_ID } from '@/test/runs';

const { run: text } = resources.inspector;

const renderRun = (run = aRun()) => {
  server.use(getGetRunMockHandler(run));
  renderWithProviders(<RunTab runId={RUN_ID} />);
};

const group = (name: string) => screen.findByRole('region', { name });

describe('RunTab', () => {
  it('shows the empty state while no Run is selected', () => {
    renderWithProviders(<RunTab runId={null} />);

    expect(screen.getByText(text.emptyTitle)).toBeInTheDocument();
  });

  it("shows the Run's end status, Steps, duration and tokens against the Run budget", async () => {
    renderRun();

    expect(await screen.findByText('partial')).toBeInTheDocument();
    expect(screen.getByText(/^9 Steps · 41\.2s · 27 Oct, \d\d:\d\d$/)).toBeInTheDocument();
    expect(screen.getByText('38,410 / 60,000 tokens')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Run budget' })).toHaveValue(38410);
  });

  it("shows each Intake Agent's part of the Brief under its name", async () => {
    renderRun(
      aRun({
        brief: { language: { language: 'Czech' }, session: null, missing: ['session'] },
        steps: [],
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Brief' })).toBeInTheDocument();
    expect(screen.getByText('language').tagName).toBe('DT');
    expect(screen.getByText('language: Czech')).toBeInTheDocument();
    expect(screen.getByText('session').tagName).toBe('DT');
    expect(screen.getByText(text.briefMissing)).toBeInTheDocument();
    expect(screen.queryByText('missing')).not.toBeInTheDocument();
  });

  it('opens the whole Brief in a dialog', async () => {
    const user = userEvent.setup();
    renderRun(aRun({ steps: [] }));

    await user.click(await screen.findByRole('button', { name: text.briefShowFull }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Brief' }));
    expect(dialog.getByRole('heading', { name: 'language' })).toBeInTheDocument();
    expect(
      dialog.getByText(/englishRestatement: Compare BullMQ and Redis Streams\./),
    ).toBeInTheDocument();
    expect(dialog.getByRole('heading', { name: 'session' })).toBeInTheDocument();
    expect(dialog.getByText('summary: The user owns the worker app.')).toBeInTheDocument();
  });

  it('groups the Steps by Intake, turn and answer, marking the ones that ran in parallel', async () => {
    renderRun();

    const intake = within(await group('Intake'));
    expect(intake.getByText('2 in parallel')).toBeInTheDocument();
    expect(intake.getAllByRole('button').map((row) => row.textContent)).toEqual([
      'Detecting the language0.8s',
      'Summarising the Session2.1s',
    ]);

    const turn2 = within(await group('Turn 2'));
    expect(turn2.getByText('2 in parallel')).toBeInTheDocument();
    expect(turn2.getAllByRole('button')).toHaveLength(3);
    expect(
      turn2.getByRole('button', { name: /^Failed\s*Reviewing\s*critic\s*3\.0s$/ }),
    ).toBeInTheDocument();
    expect(turn2.getAllByRole('img', { name: 'Completed' })).toHaveLength(2);

    expect(within(await group('Turn 1')).getAllByRole('button')).toHaveLength(3);
    const answer = within(await group('Answer'));
    expect(answer.getByRole('button', { name: /Writing the answer/ })).toBeInTheDocument();
    expect(answer.queryByText(/in parallel/)).not.toBeInTheDocument();
  });

  it('keeps a Step collapsed until it is selected, then shows its facts and a look at its input', async () => {
    const user = userEvent.setup();
    renderRun();
    const turn2 = within(await group('Turn 2'));
    expect(screen.queryByText('ops-cost', { exact: false })).not.toBeInTheDocument();

    await user.click(turn2.getByRole('button', { name: /Reviewing\s*critic/ }));

    expect(await turn2.findByText('claude-3-5-haiku-20241022')).toBeInTheDocument();
    expect(turn2.getByText('Agent').nextElementSibling).toHaveTextContent('critic');
    expect(turn2.getByText('delegate')).toBeInTheDocument();
    expect(turn2.getByText('2,912 tokens')).toBeInTheDocument();
    expect(turn2.getByText('Internal')).toBeInTheDocument();
    expect(turn2.getByText('The model timed out')).toBeInTheDocument();
    expect(turn2.getByText(/Challenge the ops-cost claim/)).toBeInTheDocument();
  });

  it("opens a Step's full input and output in a dialog", async () => {
    const user = userEvent.setup();
    renderRun();
    const answer = within(await group('Answer'));
    await user.click(answer.getByRole('button', { name: /Writing the answer/ }));

    await user.click(await answer.findByRole('button', { name: text.step.showFull }));

    const dialog = within(await screen.findByRole('dialog', { name: /Writing the answer/ }));
    expect(dialog.getByText(/You are the output\./)).toBeInTheDocument();
    expect(dialog.getByText(/"answer": "Keep BullMQ\."/)).toBeInTheDocument();
  });

  it('explains why a partial Run is partial', async () => {
    renderRun();

    expect(await screen.findByRole('note')).toHaveTextContent(
      'Partial answer. Reviewing (critic) failed in turn 2, so the answer was written without it.',
    );
  });

  it('explains a failed Run with what its last failed Step reported', async () => {
    const failing = aStep('output', 'output', 'output', 1, {
      status: 'failed',
      error: { success: false, error: 'Internal', message: 'The model timed out' },
    });
    renderRun(aRun({ status: 'failed', steps: [failing] }));
    expect(await screen.findByRole('note')).toHaveTextContent('Run failed. The model timed out');
  });

  it('explains a cancelled Run', async () => {
    renderRun(aRun({ status: 'cancelled', steps: [] }));

    expect(await screen.findByRole('note')).toHaveTextContent(
      `${text.end.cancelledTitle} ${text.end.cancelledReason}`,
    );
  });

  it('adds no explanation to a completed Run, and shows plain tokens before a budget is set', async () => {
    renderRun(aRun({ status: 'completed', tokenBudget: null, steps: [] }));

    expect(await screen.findByText('completed')).toBeInTheDocument();
    expect(screen.getByText('38,410 tokens')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(text.end.partialTitle)).not.toBeInTheDocument();
  });

  it('says so when the Run is gone, and when it could not be loaded', async () => {
    server.use(mockApiError('get', API_ROUTE.run, 404));
    const { unmount } = renderWithProviders(<RunTab runId={RUN_ID} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(text.notFound);
    unmount();

    server.use(mockApiError('get', API_ROUTE.run, 500));
    renderWithProviders(<RunTab runId={RUN_ID} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(text.loadFailed);
  });
});
