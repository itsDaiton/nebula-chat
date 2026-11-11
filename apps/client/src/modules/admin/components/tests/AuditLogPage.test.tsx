import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getListAuditEntriesMockHandler } from '@/libs/api/generated/admin/admin.msw';
import type { AuditEntry } from '@/libs/api/generated/model/auditEntry';
import { useAdminDetailStore } from '@/modules/admin/stores/useAdminDetailStore';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { API_ROUTE, mockApiError } from '@/test/api';
import { aSession, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const text = resources.admin.audit;

const anEntry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
  id: '0190a1b2-0000-7000-8000-000000000001',
  actorType: 'admin',
  actorUserId: 'aaaa1111-0000-7000-8000-000000000000',
  action: 'user.banned',
  targetType: 'user',
  targetId: 'spam-bot-42',
  detail: { reason: 'Automated prompts', cancelledRuns: 1 },
  createdAt: '2026-10-27T21:02:11Z',
  ...overrides,
});

const operatorEntry = anEntry({
  id: '0190a1b2-0000-7000-8000-000000000002',
  actorType: 'operator',
  actorUserId: null,
  action: 'admin.granted',
  targetId: 'tomas',
});
const systemEntry = anEntry({
  id: '0190a1b2-0000-7000-8000-000000000003',
  actorType: 'system',
  actorUserId: null,
  action: 'users.purged',
  targetId: '41 Guests',
});

const serveAudit = (entries: AuditEntry[], nextCursor: string | null = null) =>
  server.use(getListAuditEntriesMockHandler({ entries, nextCursor, hasMore: nextCursor !== null }));

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
  useAdminDetailStore.setState({ selection: null });
  usePanelStore.setState({ leftOpen: true, rightOpen: true, sheetOpen: false });
  stubViewport(true);
});

describe('Audit log page', () => {
  it('lists entries and tells the Operator and the system apart from an Admin', async () => {
    serveAudit([anEntry(), operatorEntry, systemEntry]);

    await renderRoute('/admin/audit');

    const table = await screen.findByRole('table', { name: text.title });
    expect(await within(table).findByText('aaaa1111')).toBeInTheDocument();
    expect(within(table).getByText(text.actors.operator)).toBeInTheDocument();
    expect(within(table).getByText(text.actors.system)).toBeInTheDocument();
    expect(within(table).getByText('users.purged')).toBeInTheDocument();
    expect(screen.getByText(resources.admin.table.showing(3))).toBeInTheDocument();
  });

  it('sends the URL filters to the API', async () => {
    let query = new URLSearchParams();
    server.use(
      getListAuditEntriesMockHandler(({ request }) => {
        query = new URL(request.url).searchParams;
        return { entries: [], nextCursor: null, hasMore: false };
      }),
    );

    await renderRoute(
      '/admin/audit?actor=operator&action=user.banned&target=spam&from=2026-10-20&to=2026-10-27',
    );

    await screen.findByText(text.empty);
    expect(Object.fromEntries(query)).toEqual({
      limit: '50',
      actorType: 'operator',
      action: 'user.banned',
      targetId: 'spam',
      from: '2026-10-20T00:00:00Z',
      to: '2026-10-28T00:00:00Z',
    });
    expect(screen.getByRole('button', { name: 'Actor: operator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action: user.banned' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Target: spam' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20 Oct – 27 Oct' })).toBeInTheDocument();
  });

  it('writes each filter choice to the URL and starts again from the newest entry', async () => {
    serveAudit([anEntry()]);
    const { router } = await renderRoute('/admin/audit?cursor=abc');
    await screen.findByRole('table', { name: text.title });

    await userEvent.click(screen.getByRole('button', { name: 'Action: any' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'user.banned' }));
    await waitFor(() => expect(router.state.location.search).toEqual({ action: 'user.banned' }));

    await userEvent.click(screen.getByRole('button', { name: text.filter.target }));
    await userEvent.type(
      await screen.findByRole('textbox', { name: text.filter.target }),
      'spam{Enter}',
    );
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ action: 'user.banned', target: 'spam' }),
    );

    await userEvent.click(screen.getByRole('button', { name: text.filter.dates }));
    fireEvent.change(await screen.findByLabelText(text.filter.from), {
      target: { value: '2026-10-20' },
    });
    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        action: 'user.banned',
        target: 'spam',
        from: '2026-10-20',
      }),
    );
    expect(screen.getByRole('button', { name: 'From 20 Oct' })).toBeInTheDocument();
  });

  it('clears a filter with the × on its chip', async () => {
    serveAudit([anEntry()]);
    const { router } = await renderRoute('/admin/audit?actor=operator&target=spam');
    await screen.findByRole('table', { name: text.title });

    await userEvent.click(screen.getByRole('button', { name: text.filter.clear('Actor') }));
    await waitFor(() => expect(router.state.location.search).toEqual({ target: 'spam' }));

    await userEvent.click(screen.getByRole('button', { name: text.filter.clear('Target') }));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });

  it('pages by cursor, and Previous goes back to the page before', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      getListAuditEntriesMockHandler(({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return cursor
          ? { entries: [operatorEntry], nextCursor: null, hasMore: false }
          : { entries: [anEntry()], nextCursor: 'next-cursor', hasMore: true };
      }),
    );
    const { router } = await renderRoute('/admin/audit');
    const previous = await screen.findByRole('button', { name: resources.admin.table.previous });
    expect(previous).toBeDisabled();

    await userEvent.click(await screen.findByRole('button', { name: resources.admin.table.next }));

    expect(await screen.findByRole('row', { name: /admin\.granted/ })).toBeInTheDocument();
    expect(router.state.location.search).toEqual({ cursor: 'next-cursor' });
    expect(cursors).toEqual([null, 'next-cursor']);
    expect(screen.getByRole('button', { name: resources.admin.table.next })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: resources.admin.table.previous }));

    expect(await screen.findByRole('row', { name: /user\.banned/ })).toBeInTheDocument();
    expect(router.state.location.search).toEqual({});
  });

  it('starts again from the newest entry when Previous has no page to go back to', async () => {
    serveAudit([anEntry()], null);
    const { router } = await renderRoute('/admin/audit?cursor=pasted');
    const previous = await screen.findByRole('button', { name: resources.admin.table.previous });
    expect(previous).toBeEnabled();

    await userEvent.click(previous);

    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });

  it('shows the selected entry in the right panel with its detail JSON pretty-printed', async () => {
    serveAudit([anEntry(), operatorEntry]);
    await renderRoute('/admin/audit');

    await userEvent.click(await screen.findByRole('row', { name: /admin\.granted/ }));
    await userEvent.click(screen.getByRole('row', { name: /user\.banned/ }));

    const panel = screen.getByRole('complementary', { name: resources.shell.inspector });
    expect(within(panel).getByRole('heading', { name: 'user.banned' })).toBeInTheDocument();
    expect(within(panel).getByText('user spam-bot-42')).toBeInTheDocument();
    expect(within(panel).getByText(anEntry().id)).toBeInTheDocument();
    expect(within(panel).getByRole('region', { name: text.detail.detail }).textContent).toContain(
      JSON.stringify({ reason: 'Automated prompts', cancelledRuns: 1 }, null, 2),
    );
    expect(screen.getByRole('row', { name: /user\.banned/ })).toHaveAttribute('aria-current');

    await userEvent.click(
      within(panel).getByRole('button', { name: resources.admin.detail.close }),
    );

    expect(useAdminDetailStore.getState().selection).toBeNull();
  });

  it('drops the open entry when a filter changes, so the panel never shows a row that left the list', async () => {
    serveAudit([anEntry()]);
    await renderRoute('/admin/audit');
    await userEvent.click(await screen.findByRole('row', { name: /user\.banned/ }));
    expect(useAdminDetailStore.getState().selection).not.toBeNull();
    const panel = screen.getByRole('complementary', { name: resources.shell.inspector });
    expect(within(panel).queryByText(resources.admin.detail.empty)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Actor: any' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'operator' }));

    expect(useAdminDetailStore.getState().selection).toBeNull();
    expect(within(panel).getByText(resources.admin.detail.empty)).toBeInTheDocument();
  });

  it('opens an entry in the bottom sheet below the large breakpoint', async () => {
    stubViewport(false);
    serveAudit([anEntry()]);
    await renderRoute('/admin/audit');

    await userEvent.click(await screen.findByRole('row', { name: /user\.banned/ }));

    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByRole('heading', { name: 'user.banned' })).toBeInTheDocument();
  });

  it('shows an empty state, and an error with a way to retry', async () => {
    serveAudit([]);
    const { unmount } = await renderRoute('/admin/audit');
    expect(await screen.findByText(text.empty)).toBeInTheDocument();
    unmount();

    let attempts = 0;
    server.use(
      mockApiError('get', API_ROUTE.adminAudit, 500, { error: { code: 'Internal', message: 'x' } }),
    );
    await renderRoute('/admin/audit');
    expect(await screen.findByRole('alert')).toHaveTextContent(text.loadFailed);

    server.use(
      getListAuditEntriesMockHandler(() => {
        attempts += 1;
        return { entries: [anEntry()], nextCursor: null, hasMore: false };
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: resources.admin.table.retry }));

    expect(await screen.findByRole('row', { name: /user\.banned/ })).toBeInTheDocument();
    expect(attempts).toBe(1);
  });
});

describe('admin navigation', () => {
  it('lists every page, with the unbuilt ones disabled and labelled', async () => {
    serveAudit([]);
    await renderRoute('/admin/audit');

    const nav = await screen.findByRole('navigation', { name: resources.admin.nav.label });
    expect(within(nav).getByRole('link', { name: resources.admin.nav.back })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: resources.admin.nav.audit })).toHaveAttribute(
      'aria-current',
      'page',
    );
    for (const label of [
      resources.admin.nav.overview,
      resources.admin.nav.modelUsage,
      resources.admin.nav.users,
      resources.admin.nav.sessions,
      resources.admin.nav.runs,
      resources.admin.nav.agents,
      resources.admin.nav.operations,
    ]) {
      const row = within(nav).getByText(label).closest('[aria-disabled="true"]');
      expect(row).toHaveTextContent(resources.admin.nav.soon);
    }
  });
});
