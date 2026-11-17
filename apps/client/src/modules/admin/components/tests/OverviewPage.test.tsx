import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGetAdminOverviewMockHandler,
  getListAuditEntriesMockHandler,
} from '@/libs/api/generated/admin/admin.msw';
import type { AdminOverview } from '@/libs/api/generated/model/adminOverview';
import { useAdminDetailStore } from '@/modules/admin/stores/useAdminDetailStore';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { aSession, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const text = resources.admin.overview;

const kpi = (total: number, previousTotal: number) => ({
  total,
  previousTotal,
  series: [1, 3, 2, 5],
});

const anOverview = (overrides: Partial<AdminOverview> = {}): AdminOverview => ({
  range: '30d',
  days: ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10'],
  kpis: {
    dailyActiveUsers: kpi(214, 190),
    weeklyActiveUsers: kpi(1082, 1000),
    newRegistrations: kpi(96, 100),
    messagesSent: kpi(18240, 15000),
    estimatedSpend: kpi(142.8, 121.8),
    guestConversion: {
      conversions: 8,
      previousConversions: 6,
      rate: 0.068,
      previousRate: 0.059,
      series: [0, 1, 0, 2],
    },
  },
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

const tile = (label: string) => screen.getByText(label).closest('div')!.parentElement!;

beforeEach(() => {
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
    getListAuditEntriesMockHandler({
      entries: [
        {
          id: '0190a1b2-0000-7000-8000-000000000001',
          actorType: 'operator',
          actorUserId: null,
          actorName: null,
          action: 'admin.granted',
          targetType: 'user',
          targetId: 'tomas',
          targetLabel: 'tomas@example.com',
          detail: {},
          createdAt: new Date(Date.now() - 14 * 60_000).toISOString(),
        },
      ],
      nextCursor: null,
      hasMore: false,
      total: 1,
    }),
  );
  useAdminDetailStore.setState({ selection: null });
  usePanelStore.setState({ leftOpen: true, rightOpen: true, sheetOpen: false });
  stubViewport();
});

describe('Overview page', () => {
  it('lands /admin on the Overview with a tile per KPI: value, delta and trend', async () => {
    server.use(getGetAdminOverviewMockHandler(anOverview()));

    const { router } = await renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: text.title })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin');
    const dau = await waitFor(() => {
      const el = tile(text.tiles.dailyActiveUsers);
      expect(within(el).getByText('214')).toBeInTheDocument();
      return el;
    });
    expect(dau).toHaveTextContent('▲ 12.6%');
    expect(
      within(dau).getByRole('img', { name: text.trend(text.tiles.dailyActiveUsers) }),
    ).toBeInTheDocument();
    expect(tile(text.tiles.weeklyActiveUsers)).toHaveTextContent('1,082');
    expect(tile(text.tiles.newRegistrations)).toHaveTextContent('▼ 4.0%');
    expect(tile(text.tiles.guestConversion)).toHaveTextContent('6.8%');
    expect(tile(text.tiles.guestConversion)).toHaveTextContent('▲ 0.9 pt');
    expect(tile(text.tiles.messagesSent)).toHaveTextContent('18,240');
    const spend = tile(text.tiles.estimatedSpend);
    expect(spend).toHaveTextContent('$142.80');
    expect(spend).toHaveTextContent('▲ 17.2%');
    expect(
      within(spend).getByRole('img', { name: text.trend(text.tiles.estimatedSpend) }),
    ).toBeInTheDocument();
  });

  it('switches the range through the URL and the request', async () => {
    const ranges: (string | null)[] = [];
    server.use(
      getGetAdminOverviewMockHandler(({ request }) => {
        ranges.push(new URL(request.url).searchParams.get('range'));
        return anOverview();
      }),
    );

    const { router } = await renderRoute('/admin');
    const group = await screen.findByRole('group', { name: text.rangeLabel });
    expect(within(group).getByRole('button', { name: '30d' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(within(group).getByRole('button', { name: '7d' }));

    await waitFor(() => expect(router.state.location.search).toEqual({ range: '7d' }));
    await waitFor(() => expect(ranges).toContain('7d'));
    expect(within(group).getByRole('button', { name: '7d' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('opens on the range in the URL', async () => {
    server.use(getGetAdminOverviewMockHandler(anOverview({ range: '90d' })));

    await renderRoute('/admin?range=90d');

    const group = await screen.findByRole('group', { name: text.rangeLabel });
    expect(within(group).getByRole('button', { name: '90d' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('lists the latest Audit entries with a link to the Audit log, and shows no right panel', async () => {
    server.use(getGetAdminOverviewMockHandler(anOverview()));

    await renderRoute('/admin');

    expect(await screen.findByText('admin.granted')).toBeInTheDocument();
    expect(screen.getByText('tomas@example.com')).toBeInTheDocument();
    expect(screen.getByText('14m')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(text.viewAll) })).toHaveAttribute(
      'href',
      '/admin/audit',
    );
    expect(
      screen.queryByRole('complementary', { name: resources.shell.inspector }),
    ).not.toBeInTheDocument();
  });

  it('marks only the Overview as current in the navigation', async () => {
    server.use(getGetAdminOverviewMockHandler(anOverview()));

    await renderRoute('/admin');

    const nav = await screen.findByRole('navigation', { name: resources.admin.nav.label });
    expect(within(nav).getByRole('link', { name: resources.admin.nav.overview })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: resources.admin.nav.audit })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('shows no delta when the previous period had nothing to compare', async () => {
    server.use(
      getGetAdminOverviewMockHandler(
        anOverview({
          kpis: { ...anOverview().kpis, newRegistrations: kpi(5, 0) },
        }),
      ),
    );

    await renderRoute('/admin');

    await waitFor(() => expect(tile(text.tiles.newRegistrations)).toHaveTextContent('5'));
    expect(tile(text.tiles.newRegistrations)).toHaveTextContent(`— ${text.vsPrevious}`);
  });
});
