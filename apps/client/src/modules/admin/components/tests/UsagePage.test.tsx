import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGetModelUsageDetailMockHandler,
  getGetModelUsageSeriesMockHandler,
  getGetModelUsageTotalsMockHandler,
  getGetRunUsageAgentDetailMockHandler,
  getGetRunUsageSeriesMockHandler,
} from '@/libs/api/generated/admin/admin.msw';
import type { UsageAgentDetail } from '@/libs/api/generated/model/usageAgentDetail';
import type { UsageRunSeries } from '@/libs/api/generated/model/usageRunSeries';
import type { UsageDetail } from '@/libs/api/generated/model/usageDetail';
import type { UsageSeries } from '@/libs/api/generated/model/usageSeries';
import type { UsageTotals } from '@/libs/api/generated/model/usageTotals';
import { useUsageTableStore } from '@/modules/admin/stores/useUsageTableStore';
import { useUsageHoverStore } from '@/modules/admin/stores/useUsageHoverStore';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { aSession, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const text = resources.admin.usage;

const aSeries = (overrides: Partial<UsageSeries> = {}): UsageSeries => ({
  metric: 'prompts',
  range: '30d',
  days: ['2026-10-01', '2026-10-02', '2026-10-03'],
  series: [
    { key: 'gpt-4o-mini', kind: 'model', total: 60, values: [10, 20, 30], members: [] },
    { key: 'run', kind: 'run', total: 30, values: [5, 10, 15], members: [] },
    { key: 'gpt-5', kind: 'model', total: 6, values: [1, 2, 3], members: [] },
  ],
  ...overrides,
});

const total = (value: number, previousTotal: number) => ({ total: value, previousTotal });

const average = (value: number | null, previousValue: number | null) => ({
  value,
  previousValue,
});

const aTotals = (): UsageTotals => ({
  range: '30d',
  prompts: total(18240, 15000),
  tokens: total(41_200_000, 35_000_000),
  spend: total(142.8, 120),
  activeUsers: total(1082, 1000),
  runs: total(1315, 800),
  runAverages: {
    stepsPerRun: average(6.5, 6),
    callsPerRun: average(4.25, 4),
    tokensPerRun: average(9_800, 10_000),
    costPerRun: average(0.12, 0.1),
    durationMs: average(42_000, 40_000),
  },
  cacheHitRate: { rate: 0.114, previousRate: 0.126 },
});

const aDetail = (overrides: Partial<UsageDetail> = {}): UsageDetail => ({
  model: 'gpt-4o-mini',
  day: '2026-10-03',
  prompts: 30,
  calls: 30,
  inputPerCall: 2410,
  outputPerCall: 612,
  costPerCall: 0.0019,
  cacheReplays: 4,
  completionRate: 0.986,
  avgDurationMs: 4200,
  trend: [10, 20, 30],
  ...overrides,
});

const aRunSeries = (overrides: Partial<UsageRunSeries> = {}): UsageRunSeries => ({
  range: '30d',
  days: ['2026-10-01', '2026-10-02', '2026-10-03'],
  outcomes: [
    { outcome: 'completed', total: 9, values: [2, 3, 4] },
    { outcome: 'partial', total: 2, values: [0, 1, 1] },
    { outcome: 'failed', total: 1, values: [0, 0, 1] },
    { outcome: 'cancelled', total: 0, values: [0, 0, 0] },
  ],
  agents: [
    {
      key: 'orchestrator',
      spendTotal: 0.9,
      tokensTotal: 900,
      spend: [0.1, 0.3, 0.5],
      tokens: [100, 300, 500],
    },
    {
      key: 'writer',
      spendTotal: 0.3,
      tokensTotal: 300,
      spend: [0.1, 0.1, 0.1],
      tokens: [100, 100, 100],
    },
  ],
  ...overrides,
});

const anAgentDetail = (overrides: Partial<UsageAgentDetail> = {}): UsageAgentDetail => ({
  agent: 'orchestrator',
  day: '2026-10-03',
  calls: 12,
  inputPerCall: 3100,
  outputPerCall: 410,
  costPerCall: 0.0042,
  cacheReplays: 2,
  completionRate: 0.9,
  avgDurationMs: 5300,
  trend: [3, 5, 12],
  ...overrides,
});

const stubViewport = () =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

const seriesRequests: URLSearchParams[] = [];
const runSeriesRequests: URLSearchParams[] = [];
const agentRequests: URLSearchParams[] = [];
const detailRequests: URLSearchParams[] = [];

const serveUsage = (series: UsageSeries = aSeries(), runSeries: UsageRunSeries = aRunSeries()) =>
  server.use(
    getGetRunUsageSeriesMockHandler(({ request }) => {
      runSeriesRequests.push(new URL(request.url).searchParams);
      return runSeries;
    }),
    getGetRunUsageAgentDetailMockHandler(({ request }) => {
      agentRequests.push(new URL(request.url).searchParams);
      return anAgentDetail();
    }),
    getGetModelUsageSeriesMockHandler(({ request }) => {
      seriesRequests.push(new URL(request.url).searchParams);
      return series;
    }),
    getGetModelUsageTotalsMockHandler(aTotals()),
    getGetModelUsageDetailMockHandler(({ request }) => {
      detailRequests.push(new URL(request.url).searchParams);
      return aDetail();
    }),
  );

const list = () => screen.getByText(text.shareOfDay).closest('div')!.parentElement!;

beforeEach(() => {
  seriesRequests.length = 0;
  runSeriesRequests.length = 0;
  agentRequests.length = 0;
  detailRequests.length = 0;
  serveChatPage();
  server.use(
    mockGetSession(
      aSession({
        isAnonymous: false,
        emailVerified: true,
        role: 'admin',
        twoFactorEnabled: true,
        twoFactorVerified: true,
      }),
    ),
  );
  usePanelStore.setState({ leftOpen: true, rightOpen: true, sheetOpen: false });
  useUsageHoverStore.setState({ day: null });
  useUsageTableStore.setState({ asTable: false });
  stubViewport();
});

describe('Model usage page', () => {
  it('renders the toolbar, the totals tiles, the chart and the ranked list for the latest day', async () => {
    serveUsage();

    await renderRoute('/admin/usage');

    expect(await screen.findByRole('heading', { name: text.title })).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: text.chartLabel(text.metrics.prompts) }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: text.tiles.activeUsers })).toHaveTextContent(
      '1,082',
    );
    expect(screen.getByRole('group', { name: text.tiles.tokens })).toHaveTextContent('41.2M');
    expect(screen.getByRole('group', { name: text.tiles.spend })).toHaveTextContent('$142.80');
    expect(screen.getByRole('group', { name: text.tiles.cacheHitRate })).toHaveTextContent(
      '▼ 1.2 pt',
    );
    expect(within(list()).getByText('3 Oct')).toBeInTheDocument();
    const rows = within(list()).getAllByRole('button', { name: /^Pin / });
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      text.pin('GPT-4o mini'),
      text.pin('GPT-5'),
    ]);
    expect(within(list()).getByText(text.run)).toBeInTheDocument();
  });

  it('follows the day under the keyboard focus in the ranked list', async () => {
    serveUsage();
    await renderRoute('/admin/usage');
    const chart = await screen.findByRole('img', { name: text.chartLabel(text.metrics.prompts) });

    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    await waitFor(() => expect(within(list()).getByText('2 Oct')).toBeInTheDocument());
    expect(within(list()).getByText('20')).toBeInTheDocument();
  });

  it('writes the metric, range, audience and view to the URL and the request', async () => {
    serveUsage();
    const { router } = await renderRoute('/admin/usage');
    await screen.findByRole('group', { name: text.metric });

    await userEvent.click(
      within(screen.getByRole('group', { name: text.metric })).getByRole('button', {
        name: text.metrics.tokens,
      }),
    );
    await userEvent.click(
      within(screen.getByRole('group', { name: text.range })).getByRole('button', { name: '7d' }),
    );
    await userEvent.click(
      within(screen.getByRole('group', { name: text.audience })).getByRole('button', {
        name: text.audiences.guests,
      }),
    );
    await userEvent.click(
      within(screen.getByRole('group', { name: text.view })).getByRole('button', {
        name: text.views.share,
      }),
    );

    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        metric: 'tokens',
        range: '7d',
        audience: 'guests',
        view: 'share',
      }),
    );
    await waitFor(() => {
      const last = seriesRequests.at(-1);
      expect(last?.get('metric')).toBe('tokens');
      expect(last?.get('range')).toBe('7d');
      expect(last?.get('audience')).toBe('guests');
    });
  });

  it('opens on the choices in the URL', async () => {
    serveUsage();

    await renderRoute('/admin/usage?metric=spend&range=90d&view=share&audience=registered');

    const pressed = async (group: string, name: string) =>
      expect(
        within(await screen.findByRole('group', { name: group })).getByRole('button', { name }),
      ).toHaveAttribute('aria-pressed', 'true');
    await pressed(text.metric, text.metrics.spend);
    await pressed(text.range, '90d');
    await pressed(text.view, text.views.share);
    await pressed(text.audience, text.audiences.registered);
    await waitFor(() => expect(seriesRequests.at(-1)?.get('metric')).toBe('spend'));
  });

  it('normalises the Share view to a percent of each day', async () => {
    serveUsage();

    await renderRoute('/admin/usage?view=share');

    await screen.findByRole('img', { name: text.chartLabel(text.metrics.prompts) });
    // The last day holds 30 + 15 + 3 prompts.
    expect(within(list()).getAllByText('62.5%')).toHaveLength(2);
  });

  it('pins a Model on click, shows its day in the right panel and unpins on a second click', async () => {
    serveUsage();
    const { router } = await renderRoute('/admin/usage');

    await userEvent.click(await screen.findByRole('button', { name: text.pin('GPT-5') }));

    await waitFor(() => expect(router.state.location.search).toEqual({ pinned: 'gpt-5' }));
    expect(await screen.findByText(`gpt-5 · ${text.detail.pinned}`)).toBeInTheDocument();
    await waitFor(() => expect(detailRequests.at(-1)?.get('model')).toBe('gpt-5'));
    expect(detailRequests.at(-1)?.get('day')).toBe('2026-10-03');

    await userEvent.click(screen.getByRole('button', { name: text.unpin('GPT-5') }));

    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });

  it('describes the top Model in the right panel until one is pinned, with full word labels', async () => {
    serveUsage();

    await renderRoute('/admin/usage');

    expect(await screen.findByText('2,410 tokens')).toBeInTheDocument();
    expect(screen.getByText('612 tokens')).toBeInTheDocument();
    expect(screen.getByText('$0.0019')).toBeInTheDocument();
    expect(screen.getByText('98.6%')).toBeInTheDocument();
    expect(screen.getByText('4.2s')).toBeInTheDocument();
    expect(screen.getByText(text.detail.input)).toBeInTheDocument();
    expect(screen.queryByText(/\btok\b/)).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(text.detail.pinned))).not.toBeInTheDocument();
  });

  it('labels the right panel averages per call, not per prompt', async () => {
    serveUsage();

    await renderRoute('/admin/usage');

    expect(await screen.findByText('Input / call')).toBeInTheDocument();
    expect(screen.getByText('Output / call')).toBeInTheDocument();
    expect(screen.getByText('Cost / call')).toBeInTheDocument();
    expect(screen.queryByText(/\/ prompt/)).not.toBeInTheDocument();
  });

  it('shows only the footnote of the selected metric, keeping View as table', async () => {
    serveUsage();
    await renderRoute('/admin/usage');

    expect(await screen.findByText(text.notes.prompts)).toBeInTheDocument();
    expect(screen.queryByText(text.notes.tokens)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: text.viewAsTable })).toBeInTheDocument();

    for (const metric of ['tokens', 'spend'] as const) {
      serveUsage(aSeries({ metric }));
      await userEvent.click(
        within(screen.getByRole('group', { name: text.metric })).getByRole('button', {
          name: text.metrics[metric],
        }),
      );
      expect(await screen.findByText(text.notes[metric])).toBeInTheDocument();
      expect(screen.queryByText(text.notes.prompts)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: text.viewAsTable })).toBeInTheDocument();
    }
  });

  it('explains on hover and keyboard focus what the Run row is, and clicking opens the Runs tab', async () => {
    serveUsage();
    const { router } = await renderRoute('/admin/usage');
    await screen.findByRole('img', { name: text.chartLabel(text.metrics.prompts) });
    const row = within(list()).getByRole('button', { name: new RegExp(`^${text.run}`) });

    await userEvent.hover(row);
    expect(await screen.findByText(text.runTooltip)).toBeInTheDocument();
    await userEvent.unhover(row);
    screen.getByRole('button', { name: text.pin('GPT-4o mini') }).focus();
    await userEvent.tab();
    expect(row).toHaveFocus();
    expect(await screen.findByText(text.runTooltip)).toBeInTheDocument();

    await userEvent.click(row);

    await waitFor(() => expect(router.state.location.search).toEqual({ metric: 'runs' }));
  });

  it('explains on focus that Other groups the smaller Models', async () => {
    serveUsage(
      aSeries({
        series: [
          { key: 'gpt-4o-mini', kind: 'model', total: 60, values: [10, 20, 30], members: [] },
          {
            key: 'other',
            kind: 'other',
            total: 9,
            values: [1, 2, 6],
            members: [{ key: 'gpt-5', total: 9, values: [1, 2, 6] }],
          },
        ],
      }),
    );
    const { router } = await renderRoute('/admin/usage');
    const row = await screen.findByRole('button', { name: new RegExp(`Other \\(1\\)`) });

    row.focus();
    expect(await screen.findByText(text.otherTooltip)).toBeInTheDocument();
    await userEvent.click(row);

    expect(router.state.location.search).toEqual({});
  });

  it('sends the chosen Models as a repeated key and keeps them in the URL', async () => {
    serveUsage();
    const { router } = await renderRoute('/admin/usage');

    await userEvent.click(await screen.findByRole('button', { name: text.modelFilter }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'GPT-5' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: text.run }));

    await waitFor(() => expect(router.state.location.search).toEqual({ models: ['gpt-5', 'run'] }));
    await waitFor(() => expect(seriesRequests.at(-1)?.getAll('models')).toEqual(['gpt-5', 'run']));
  });

  it('offers the chart as a table, with a day per row and a Model per column', async () => {
    serveUsage();
    await renderRoute('/admin/usage');

    await userEvent.click(await screen.findByRole('button', { name: text.viewAsTable }));

    const table = await screen.findByRole('table', {
      name: text.tableCaption(text.metrics.prompts),
    });
    expect(within(table).getByRole('columnheader', { name: 'GPT-5' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: '1 Oct' })).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: text.viewAsChart }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('collapses Models beyond the top 8 under Other, listing them when opened', async () => {
    serveUsage(
      aSeries({
        series: [
          { key: 'gpt-4o-mini', kind: 'model', total: 60, values: [10, 20, 30], members: [] },
          {
            key: 'other',
            kind: 'other',
            total: 9,
            values: [1, 2, 6],
            members: [
              { key: 'gpt-4.1', total: 6, values: [1, 1, 4] },
              { key: 'gpt-5', total: 3, values: [0, 1, 2] },
            ],
          },
        ],
      }),
    );
    await renderRoute('/admin/usage');

    expect(await screen.findByText(text.other(2))).toBeInTheDocument();
    expect(screen.queryByText('GPT-4.1')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: text.expandOther }));
    expect(await screen.findByText('GPT-4.1')).toBeVisible();
    expect(screen.getByRole('button', { name: text.pin('GPT-5') })).toBeVisible();
  });

  it('shows tile, chart and list skeletons while the first requests load, then the data', async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    server.use(
      getGetModelUsageSeriesMockHandler(async () => {
        await held;
        return aSeries();
      }),
      getGetModelUsageTotalsMockHandler(async () => {
        await held;
        return aTotals();
      }),
      getGetModelUsageDetailMockHandler(aDetail()),
    );

    await renderRoute('/admin/usage');

    expect(await screen.findByRole('status', { name: text.loading })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: text.tilesLoading })).toBeInTheDocument();
    release();
    expect(
      await screen.findByRole('img', { name: text.chartLabel(text.metrics.prompts) }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: text.loading })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: text.tilesLoading })).not.toBeInTheDocument();
  });

  it('keeps the chart and list on screen, dimmed and busy, while a new metric loads, leaving the totals as they are', async () => {
    server.use(
      getGetModelUsageSeriesMockHandler(async ({ request }) => {
        if (new URL(request.url).searchParams.get('metric') === 'tokens') await delay('infinite');
        return aSeries();
      }),
      getGetModelUsageTotalsMockHandler(aTotals()),
      getGetModelUsageDetailMockHandler(aDetail()),
    );

    await renderRoute('/admin/usage');
    const data = await screen.findByRole('region', { name: text.dataLabel });
    await screen.findByRole('img', { name: text.chartLabel(text.metrics.prompts) });
    expect(data).toHaveAttribute('aria-busy', 'false');

    await userEvent.click(
      within(screen.getByRole('group', { name: text.metric })).getByRole('button', {
        name: text.metrics.tokens,
      }),
    );

    await waitFor(() => expect(data).toHaveAttribute('aria-busy', 'true'));
    expect(
      within(data).getByRole('img', { name: text.chartLabel(text.metrics.prompts) }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: text.tilesLabel })).toHaveAttribute(
      'aria-busy',
      'false',
    );
    expect(screen.queryByRole('status', { name: text.loading })).not.toBeInTheDocument();
  });

  it('keeps the totals on screen, dimmed and busy, while a new range loads', async () => {
    server.use(
      getGetModelUsageSeriesMockHandler(aSeries()),
      getGetModelUsageTotalsMockHandler(async ({ request }) => {
        if (new URL(request.url).searchParams.get('range') === '7d') await delay('infinite');
        return aTotals();
      }),
      getGetModelUsageDetailMockHandler(aDetail()),
    );

    await renderRoute('/admin/usage');
    const tiles = await screen.findByRole('region', { name: text.tilesLabel });
    await waitFor(() => expect(tiles).toHaveTextContent('41.2M'));

    await userEvent.click(
      within(screen.getByRole('group', { name: text.range })).getByRole('button', { name: '7d' }),
    );

    await waitFor(() => expect(tiles).toHaveAttribute('aria-busy', 'true'));
    expect(within(tiles).getByRole('group', { name: text.tiles.tokens })).toHaveTextContent(
      '41.2M',
    );
  });

  it('enables Model usage in the navigation and marks it current', async () => {
    serveUsage();

    await renderRoute('/admin/usage');

    const nav = await screen.findByRole('navigation', { name: resources.admin.nav.label });
    expect(within(nav).getByRole('link', { name: resources.admin.nav.modelUsage })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

describe('Runs tab', () => {
  const runsTab = () =>
    within(screen.getByRole('group', { name: text.metric })).getByRole('button', {
      name: text.metrics.runs,
    });

  it('sits beside Prompts, Tokens and Est. spend and shows the per-Run tiles, chart and Agents', async () => {
    serveUsage();

    await renderRoute('/admin/usage?metric=runs&range=7d&audience=guests');

    expect(await screen.findByRole('img', { name: text.runs.chartLabel })).toBeInTheDocument();
    expect(runsTab()).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('group', { name: text.tiles.costPerRun })).toHaveTextContent(
      '$0.12',
    );
    expect(screen.getByRole('group', { name: text.tiles.runs })).toHaveTextContent('1,315');
    expect(screen.getByRole('group', { name: text.tiles.stepsPerRun })).toHaveTextContent('6.5');
    expect(screen.getByRole('group', { name: text.tiles.callsPerRun })).toHaveTextContent('4.3');
    expect(screen.getByRole('group', { name: text.tiles.durationMs })).toHaveTextContent('42.0s');
    const rows = within(list()).getAllByRole('button', { name: /^Pin / });
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      text.pin('orchestrator'),
      text.pin('writer'),
    ]);
    expect(within(list()).getByText('$0.50')).toBeInTheDocument();
    expect(runSeriesRequests.at(-1)?.get('range')).toBe('7d');
    expect(runSeriesRequests.at(-1)?.get('audience')).toBe('guests');
    expect(seriesRequests).toHaveLength(0);
    expect(screen.queryByRole('group', { name: text.view })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: text.modelFilter })).not.toBeInTheDocument();
    expect(screen.getByText(text.notes.runs)).toBeInTheDocument();
  });

  it('switches to the tab from the toolbar and clears a pinned Model', async () => {
    serveUsage();
    const { router } = await renderRoute('/admin/usage?pinned=gpt-5');
    await screen.findByRole('group', { name: text.metric });

    await userEvent.click(runsTab());

    await waitFor(() => expect(router.state.location.search).toEqual({ metric: 'runs' }));
    expect(await screen.findByRole('img', { name: text.runs.chartLabel })).toBeInTheDocument();
  });

  it('pins an Agent and shows its day in the right panel', async () => {
    serveUsage();
    const { router } = await renderRoute('/admin/usage?metric=runs');

    await userEvent.click(await screen.findByRole('button', { name: text.pin('writer') }));

    await waitFor(() =>
      expect(router.state.location.search).toEqual({ metric: 'runs', pinned: 'writer' }),
    );
    await waitFor(() => expect(agentRequests.at(-1)?.get('agent')).toBe('writer'));
    expect(agentRequests.at(-1)?.get('day')).toBe('2026-10-03');
    expect(await screen.findByText('3,100 tokens')).toBeInTheDocument();
    expect(screen.getByText(text.runs.detail.calls)).toBeInTheDocument();
    expect(screen.getByText('$0.0042')).toBeInTheDocument();
  });

  it('describes the costliest Agent until one is pinned', async () => {
    serveUsage();

    await renderRoute('/admin/usage?metric=runs');

    await waitFor(() => expect(agentRequests.at(-1)?.get('agent')).toBe('orchestrator'));
  });

  it('follows the day under the keyboard focus in the Agent list', async () => {
    serveUsage();
    await renderRoute('/admin/usage?metric=runs');
    const chart = await screen.findByRole('img', { name: text.runs.chartLabel });

    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    await waitFor(() => expect(within(list()).getByText('2 Oct')).toBeInTheDocument());
    expect(within(list()).getByText('$0.30')).toBeInTheDocument();
  });

  it('reads the exact numbers as a table by outcome', async () => {
    serveUsage();
    await renderRoute('/admin/usage?metric=runs');

    await userEvent.click(await screen.findByRole('button', { name: text.viewAsTable }));

    const table = await screen.findByRole('table', { name: text.runs.tableCaption });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      text.day,
      text.runs.outcomes.completed,
      text.runs.outcomes.partial,
      text.runs.outcomes.failed,
      text.runs.outcomes.cancelled,
    ]);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('shows an empty state when no Run happened in the range', async () => {
    serveUsage(
      aSeries(),
      aRunSeries({
        outcomes: aRunSeries().outcomes.map((item) => ({ ...item, total: 0, values: [0, 0, 0] })),
        agents: [],
      }),
    );

    await renderRoute('/admin/usage?metric=runs');

    expect(await screen.findByText(text.runs.empty)).toBeInTheDocument();
  });

  it('shows a skeleton while the series loads', async () => {
    serveUsage();
    server.use(
      getGetRunUsageSeriesMockHandler(async () => {
        await delay(200);
        return aRunSeries();
      }),
    );
    await renderRoute('/admin/usage?metric=runs');
    expect(await screen.findByRole('status', { name: text.runs.loading })).toBeInTheDocument();
  });

  it('shows an error line when the request fails', async () => {
    serveUsage();
    server.use(
      http.get('*/api/admin/usage/runs/series', () =>
        HttpResponse.json({ error: 'Internal', message: 'boom' }, { status: 500 }),
      ),
    );

    await renderRoute('/admin/usage?metric=runs');

    expect(await screen.findByText(text.runs.loadFailed)).toBeInTheDocument();
  });
});
