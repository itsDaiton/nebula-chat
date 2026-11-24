import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getListAllRunsMockHandler } from '@/libs/api/generated/admin/admin.msw';
import { getGetRunMockHandler } from '@/libs/api/generated/runs/runs.msw';
import type { AdminRunListItem } from '@/libs/api/generated/model/adminRunListItem';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { aSession, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';
import { aRun, RUN_ID } from '@/test/runs';

const text = resources.admin.runs;
const status = resources.inspector.run.status;

const ANNA_ID = '0190a1b2-0000-7000-8000-00000000000a';
const SESSION_ID = '0190a1b2-0000-7000-8000-0000000000a1';
const NEXT_ID = '0190a1b2-0000-7000-8000-0000000000c9';

const aListed = (overrides: Partial<AdminRunListItem> = {}): AdminRunListItem => ({
  id: RUN_ID,
  status: 'partial',
  startedAt: '2026-10-27T21:14:00Z',
  durationMs: 41_200,
  stepCount: 9,
  tokensUsed: 38_410,
  tokenBudget: 60_000,
  costUsd: 0.031,
  owner: { id: ANNA_ID, name: 'Anna Nováková' },
  session: { id: SESSION_ID, title: 'Should we move replies' },
  ...overrides,
});

const serveRuns = (runs: AdminRunListItem[], nextCursor: string | null = null) => {
  const queries: URLSearchParams[] = [];
  server.use(
    getListAllRunsMockHandler(({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return { runs, nextCursor, hasMore: nextCursor !== null };
    }),
  );
  return queries;
};

const serveRun = () => {
  const reads: string[] = [];
  server.use(
    getGetRunMockHandler(({ request }) => {
      reads.push(request.url);
      return aRun();
    }),
  );
  return reads;
};

const asJson = (value: unknown) => encodeURIComponent(JSON.stringify(value));

const stubViewport = (desktop: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: desktop,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

// jsdom lays nothing out, so the virtualizer would see a zero-height scroller and render no rows.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 900 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 40 });
});

afterAll(() => {
  // @ts-expect-error restores jsdom's own layout properties
  delete HTMLElement.prototype.clientHeight;
  // @ts-expect-error restores jsdom's own layout properties
  delete HTMLElement.prototype.clientWidth;
  // @ts-expect-error restores jsdom's own layout properties
  delete HTMLElement.prototype.offsetHeight;
});

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
  );
  usePanelStore.setState({ leftOpen: true, rightOpen: true, sheetOpen: false });
  stubViewport(true);
});

describe('Runs page', () => {
  it('lists Runs with status, owner, Session, duration, Steps, tokens and cost', async () => {
    const queries = serveRuns([
      aListed(),
      aListed({
        id: NEXT_ID,
        status: 'running',
        durationMs: null,
        costUsd: null,
        stepCount: 4,
        session: { id: SESSION_ID, title: 'Index strategy' },
      }),
    ]);

    await renderRoute('/admin/runs');

    const table = await screen.findByRole('table', { name: text.title });
    const done = within(await within(table).findByRole('row', { name: /Should we move/ }));
    expect(done.getByText(status.partial)).toBeInTheDocument();
    expect(done.getByText('Anna Nováková')).toBeInTheDocument();
    expect(done.getByText('41.2s')).toBeInTheDocument();
    expect(done.getByText('9')).toBeInTheDocument();
    expect(done.getByText('38,410')).toBeInTheDocument();
    expect(done.getByRole('img', { name: text.budgetUsed(38_410, 60_000) })).toBeInTheDocument();
    expect(done.getByText('$0.031')).toBeInTheDocument();

    const inFlight = within(within(table).getByRole('row', { name: /Index strategy/ }));
    expect(inFlight.getByText(status.running)).toBeInTheDocument();
    expect(inFlight.getAllByText('–')).toHaveLength(2);
    expect(Object.fromEntries(queries[0])).toEqual({
      limit: '50',
      sortBy: 'startedAt',
      order: 'desc',
    });
  });

  it('restores filters, sort and cursor from the URL, and sends them to the API', async () => {
    const queries = serveRuns([]);
    server.use(
      getListAllRunsMockHandler(({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return { runs: [], nextCursor: null, hasMore: false };
      }),
    );

    await renderRoute(
      `/admin/runs?status=${asJson(['failed', 'partial'])}&user=${ANNA_ID}&from=2026-09-28&to=2026-10-27&sort=cost&dir=asc&cursor=${NEXT_ID}`,
    );

    expect(await screen.findByText(text.empty)).toBeInTheDocument();
    const query = queries.at(-1) as URLSearchParams;
    expect(query.getAll('status')).toEqual(['failed', 'partial']);
    expect(Object.fromEntries(query)).toMatchObject({
      userId: ANNA_ID,
      from: '2026-09-28T00:00:00Z',
      to: '2026-10-28T00:00:00Z',
      sortBy: 'cost',
      order: 'asc',
      cursor: NEXT_ID,
    });
    expect(screen.getByRole('button', { name: status.failed })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: status.completed })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('writes a status chip and a sort to the URL, starting again from the first page', async () => {
    serveRuns([aListed()]);
    const { router } = await renderRoute(`/admin/runs?cursor=${NEXT_ID}`);
    await screen.findByRole('table', { name: text.title });

    await userEvent.click(screen.getByRole('button', { name: status.failed }));
    await waitFor(() => expect(router.state.location.search).toEqual({ status: ['failed'] }));

    await userEvent.click(screen.getByRole('button', { name: text.sort(text.columns.cost) }));
    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        status: ['failed'],
        sort: 'cost',
        dir: 'desc',
      }),
    );

    await userEvent.click(
      screen.getByRole('button', { name: text.sort(text.columns.cost, 'desc') }),
    );
    await waitFor(() => expect(router.state.location.search).toMatchObject({ dir: 'asc' }));
  });

  it('pages by cursor through the URL', async () => {
    serveRuns([aListed()], NEXT_ID);
    const { router } = await renderRoute('/admin/runs');
    await screen.findByRole('table', { name: text.title });

    await userEvent.click(await screen.findByRole('button', { name: resources.admin.table.next }));

    await waitFor(() => expect(router.state.location.search).toEqual({ cursor: NEXT_ID }));
  });

  it('opens the Run read-only under the audit notice and records one read', async () => {
    serveRuns([aListed()]);
    const reads = serveRun();
    const { router } = await renderRoute('/admin/runs');

    await userEvent.click(await screen.findByRole('row', { name: /Should we move/ }));

    await waitFor(() => expect(router.state.location.search).toEqual({ selected: RUN_ID }));
    const panel = screen.getByRole('complementary', { name: resources.shell.inspector });
    expect(await within(panel).findByText(text.detail.notice)).toBeInTheDocument();
    expect(await within(panel).findByText('38,410 / 60,000 tokens')).toBeInTheDocument();
    expect(within(panel).getByText('Detecting the language')).toBeInTheDocument();
    expect(reads).toHaveLength(1);
  });

  it('reads the Run again each time it is opened, so every opening is audited', async () => {
    serveRuns([aListed()]);
    const reads = serveRun();
    await renderRoute('/admin/runs');

    await userEvent.click(await screen.findByRole('row', { name: /Should we move/ }));
    const panel = screen.getByRole('complementary', { name: resources.shell.inspector });
    await within(panel).findByText('Detecting the language');
    await userEvent.click(
      within(panel).getByRole('button', { name: resources.admin.detail.close }),
    );
    await userEvent.click(screen.getByRole('row', { name: /Should we move/ }));
    await within(screen.getByRole('complementary', { name: resources.shell.inspector })).findByText(
      'Detecting the language',
    );

    expect(reads).toHaveLength(2);
  });

  it('restores the open Run from a reloaded URL', async () => {
    serveRuns([aListed()]);
    serveRun();

    await renderRoute(`/admin/runs?selected=${RUN_ID}`);

    const panel = await screen.findByRole('complementary', { name: resources.shell.inspector });
    expect(await within(panel).findByText('Detecting the language')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Should we move/ })).toHaveAttribute('aria-current');
  });

  it('says so when the selected Run does not exist, without losing the table', async () => {
    serveRuns([aListed()]);
    server.use(mockApiError('get', API_ROUTE.run, 404));

    await renderRoute(`/admin/runs?selected=${RUN_ID}`);

    const panel = await screen.findByRole('complementary', { name: resources.shell.inspector });
    expect(await within(panel).findByRole('alert')).toHaveTextContent(
      resources.inspector.run.notFound,
    );
    expect(screen.getByRole('table', { name: text.title })).toBeInTheDocument();
  });

  it('shows an empty state when no Run matches', async () => {
    serveRuns([]);

    await renderRoute('/admin/runs');

    expect(await screen.findByText(text.empty)).toBeInTheDocument();
    expect(screen.getByText(text.emptyHint)).toBeInTheDocument();
  });

  it('links the owner to their User detail and the Session to its transcript', async () => {
    serveRuns([aListed()]);
    const { router } = await renderRoute('/admin/runs');

    await userEvent.click(await screen.findByRole('link', { name: 'Anna Nováková' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'));
    expect(router.state.location.search).toEqual({ selected: ANNA_ID });

    await router.navigate({ to: '/admin/runs' });
    await userEvent.click(await screen.findByRole('link', { name: 'Should we move replies' }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/admin/sessions/${SESSION_ID}`),
    );
  });

  it('puts Runs in the navigation as a link and drops Agents', async () => {
    serveRuns([]);

    await renderRoute('/admin/runs');

    const nav = await screen.findByRole('navigation', { name: resources.admin.nav.label });
    expect(within(nav).getByRole('link', { name: resources.admin.nav.runs })).toBeInTheDocument();
    expect(within(nav).queryByText('Agents')).not.toBeInTheDocument();
  });
});
