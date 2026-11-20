import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGetModelUsageDetailMockHandler,
  getGetModelUsageSeriesMockHandler,
  getGetModelUsageTotalsMockHandler,
} from '@/libs/api/generated/admin/admin.msw';
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

const aTotals = (): UsageTotals => ({
  range: '30d',
  prompts: total(18240, 15000),
  tokens: total(41_200_000, 35_000_000),
  spend: total(142.8, 120),
  activeUsers: total(1082, 1000),
  runs: total(1315, 800),
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
const detailRequests: URLSearchParams[] = [];

const serveUsage = (series: UsageSeries = aSeries()) =>
  server.use(
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
    const rows = within(list()).getAllByRole('button');
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

  it('keeps the chart, list and tiles on screen, dimmed and busy, while a new metric loads', async () => {
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
    expect(within(data).getByRole('group', { name: text.tiles.tokens })).toHaveTextContent('41.2M');
    expect(screen.queryByRole('status', { name: text.loading })).not.toBeInTheDocument();
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
