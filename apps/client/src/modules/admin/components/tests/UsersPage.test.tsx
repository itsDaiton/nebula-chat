import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay } from 'msw';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGetUserMockHandler,
  getListUserSessionsMockHandler,
  getListUsersMockHandler,
} from '@/libs/api/generated/admin/admin.msw';
import type { AdminSessionSummary } from '@/libs/api/generated/model/adminSessionSummary';
import type { AdminUserDetail } from '@/libs/api/generated/model/adminUserDetail';
import type { AdminUserSummary } from '@/libs/api/generated/model/adminUserSummary';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { aSession, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const text = resources.admin.users;

const ANNA_ID = '0190a1b2-0000-7000-8000-00000000000a';
const BOT_ID = '0190a1b2-0000-7000-8000-00000000000b';

const aUser = (overrides: Partial<AdminUserSummary> = {}): AdminUserSummary => ({
  id: ANNA_ID,
  email: 'anna@example.com',
  name: 'Anna Nováková',
  status: 'registered',
  twoFactorEnabled: false,
  messagesSent: 612,
  sessionsCount: 41,
  createdAt: '2026-03-12T10:00:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
  ...overrides,
});

const bot = aUser({
  id: BOT_ID,
  email: 'spam-bot-42@mail.test',
  name: 'spam-bot-42',
  status: 'banned',
  messagesSent: 980,
  sessionsCount: 3,
  createdAt: '2026-10-21T10:00:00Z',
});

const botDetail: AdminUserDetail = {
  ...bot,
  ban: { reason: 'Automated prompts', expiresAt: '2026-11-10T12:00:00Z' },
  pendingDeletionAt: null,
};

const aUserSession = (title: string, archived = false): AdminSessionSummary => ({
  id: crypto.randomUUID(),
  title,
  model: 'gpt-4.1-mini',
  archived,
  messageCount: 4,
  createdAt: '2026-10-22T10:00:00Z',
  updatedAt: '2026-10-22T10:00:00Z',
});

const serveUsers = (users: AdminUserSummary[]) => {
  const queries: URLSearchParams[] = [];
  server.use(
    getListUsersMockHandler(({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return { users, nextCursor: null, hasMore: false };
    }),
  );
  return queries;
};

const serveDetail = (detail: AdminUserDetail, sessions: AdminSessionSummary[] = []) =>
  server.use(
    getGetUserMockHandler(detail),
    getListUserSessionsMockHandler({ sessions, nextCursor: null, hasMore: false }),
  );

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

describe('Users page', () => {
  it('lists Users with their status and counts, asking for no status so Guests stay out', async () => {
    const queries = serveUsers([aUser(), bot]);

    await renderRoute('/admin/users');

    const table = await screen.findByRole('table', { name: text.title });
    const row = await within(table).findByRole('row', { name: /spam-bot-42/ });
    expect(within(row).getByText('spam-bot-42@mail.test')).toBeInTheDocument();
    expect(within(row).getByText(text.statuses.banned)).toBeInTheDocument();
    expect(within(row).getByText('3')).toBeInTheDocument();
    expect(within(row).getByText('980')).toBeInTheDocument();
    expect(Object.fromEntries(queries[0])).toEqual({
      limit: '50',
      sortBy: 'lastActiveAt',
      order: 'desc',
    });
  });

  it('sends the URL search, statuses and sort to the API', async () => {
    const queries = serveUsers([]);

    await renderRoute(
      `/admin/users?q=anna&status=${encodeURIComponent('["registered","guest"]')}&sort=messagesSent&dir=asc`,
    );

    expect(await screen.findByText(text.empty)).toBeInTheDocument();
    expect(queries[0].getAll('status')).toEqual(['registered', 'guest']);
    expect(queries[0].get('search')).toBe('anna');
    expect(queries[0].get('sortBy')).toBe('messagesSent');
    expect(queries[0].get('order')).toBe('asc');
    expect(screen.getByRole('searchbox', { name: text.search })).toHaveValue('anna');
    expect(screen.getByRole('button', { name: text.statuses.registered })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: text.showGuests })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: text.statuses.admin })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('writes status toggles to the URL and starts again from the first page', async () => {
    serveUsers([aUser()]);
    const { router } = await renderRoute(`/admin/users?cursor=${ANNA_ID}`);
    await screen.findByRole('table', { name: text.title });

    await userEvent.click(screen.getByRole('button', { name: text.statuses.registered }));
    await userEvent.click(screen.getByRole('button', { name: text.statuses.admin }));
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ status: ['registered', 'admin'] }),
    );

    await userEvent.click(screen.getByRole('button', { name: text.statuses.registered }));
    await userEvent.click(screen.getByRole('button', { name: text.statuses.admin }));
    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });

  it('searches once typing pauses', async () => {
    const queries = serveUsers([aUser()]);
    const { router } = await renderRoute('/admin/users');
    await screen.findByRole('table', { name: text.title });

    await userEvent.type(screen.getByRole('searchbox', { name: text.search }), 'anna');

    await waitFor(() => expect(router.state.location.search).toEqual({ q: 'anna' }));
    expect(queries.map((query) => query.get('search'))).toEqual([null, 'anna']);
  });

  it("shows the URL's search text again after going back", async () => {
    serveUsers([aUser()]);
    const { router } = await renderRoute('/admin/users');
    await screen.findByRole('table', { name: text.title });
    await userEvent.click(screen.getByRole('button', { name: text.statuses.admin }));
    await userEvent.type(screen.getByRole('searchbox', { name: text.search }), 'anna');
    await waitFor(() => expect(router.state.location.search).toMatchObject({ q: 'anna' }));
    await userEvent.click(screen.getByRole('button', { name: text.statuses.banned }));
    await waitFor(() => expect(router.state.location.search).toHaveProperty('status.1'));

    await userEvent.clear(screen.getByRole('searchbox', { name: text.search }));
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('q'));
    router.history.back();

    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: text.search })).toHaveValue('anna'),
    );
  });

  it('sorts by a column, newest or largest first, and reverses on a second click', async () => {
    serveUsers([aUser()]);
    const { router } = await renderRoute('/admin/users');
    await screen.findByRole('table', { name: text.title });
    expect(
      screen.getByRole('button', { name: text.sort(text.columns.lastActive, 'desc') }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: text.sort(text.columns.messages) }));
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ sort: 'messagesSent', dir: 'desc' }),
    );

    await userEvent.click(
      screen.getByRole('button', { name: text.sort(text.columns.messages, 'desc') }),
    );
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ sort: 'messagesSent', dir: 'asc' }),
    );
  });

  it('opens a User in the right panel, keeps the table state and puts the id in the URL', async () => {
    const queries = serveUsers([aUser(), bot]);
    serveDetail(botDetail, [aUserSession('Generate 50 product names'), aUserSession('Old', true)]);
    const { router } = await renderRoute('/admin/users?q=bot');

    await userEvent.click(await screen.findByRole('row', { name: /spam-bot-42/ }));

    const panel = screen.getByRole('complementary', { name: resources.shell.inspector });
    expect(await within(panel).findByRole('heading', { name: 'spam-bot-42' })).toBeInTheDocument();
    expect(router.state.location.search).toEqual({ q: 'bot', selected: BOT_ID });
    expect(queries).toHaveLength(1);
    expect(screen.getByRole('row', { name: /spam-bot-42/ })).toHaveAttribute('aria-current');

    expect(within(panel).getByText('spam-bot-42@mail.test')).toBeInTheDocument();
    expect(within(panel).getByText(text.statuses.banned)).toBeInTheDocument();
    expect(within(panel).getByText(text.detail.twoFactorOff)).toBeInTheDocument();
    expect(within(panel).getByText('10 Nov 2026')).toBeInTheDocument();
    expect(within(panel).getByText('Automated prompts')).toBeInTheDocument();
    expect(within(panel).getByText('21 Oct 2026')).toBeInTheDocument();
    expect(within(panel).getByText('980')).toBeInTheDocument();
    expect(within(panel).getByText(text.detail.none)).toBeInTheDocument();
    const sessions = within(panel).getByRole('region', { name: text.detail.sessions });
    expect(await within(sessions).findByText('Generate 50 product names')).toBeInTheDocument();
    expect(within(sessions).getByText(text.detail.archived)).toBeInTheDocument();

    await userEvent.click(
      within(panel).getByRole('button', { name: resources.admin.detail.close }),
    );

    await waitFor(() => expect(router.state.location.search).toEqual({ q: 'bot' }));
  });

  it("shows a loading row while the open User's Sessions load", async () => {
    serveUsers([bot]);
    server.use(
      getGetUserMockHandler(botDetail),
      getListUserSessionsMockHandler(async () => {
        await delay('infinite');
        return { sessions: [], nextCursor: null, hasMore: false };
      }),
    );

    await renderRoute(`/admin/users?selected=${BOT_ID}`);

    const sessions = await screen.findByRole('region', { name: text.detail.sessions });
    expect(
      await within(sessions).findByRole('status', { name: text.detail.sessionsLoading }),
    ).toBeInTheDocument();
  });

  it('opens the User a link names, with a ban that has no end and a Pending deletion date', async () => {
    serveUsers([bot]);
    serveDetail({
      ...botDetail,
      twoFactorEnabled: true,
      ban: { reason: null, expiresAt: null },
      pendingDeletionAt: '2026-10-25T12:00:00Z',
    });

    await renderRoute(`/admin/users?selected=${BOT_ID}`);

    const panel = screen.getByRole('complementary', { name: resources.shell.inspector });
    expect(await within(panel).findByRole('heading', { name: 'spam-bot-42' })).toBeInTheDocument();
    expect(within(panel).getByText(text.detail.bannedPermanently)).toBeInTheDocument();
    expect(within(panel).getByText(text.detail.twoFactorOn)).toBeInTheDocument();
    expect(within(panel).getByText('25 Oct 2026')).toBeInTheDocument();
    expect(await within(panel).findByText(text.detail.noSessions)).toBeInTheDocument();
  });

  it('opens the panel for a linked User even when it was left closed', async () => {
    usePanelStore.setState({ rightOpen: false });
    serveUsers([bot]);
    serveDetail(botDetail);

    await renderRoute(`/admin/users?selected=${BOT_ID}`);

    const panel = await screen.findByRole('complementary', { name: resources.shell.inspector });
    expect(await within(panel).findByRole('heading', { name: 'spam-bot-42' })).toBeInTheDocument();
  });

  it('asks for a User to be picked while none is open', async () => {
    serveUsers([aUser()]);

    await renderRoute('/admin/users');

    const panel = await screen.findByRole('complementary', { name: resources.shell.inspector });
    expect(within(panel).getByText(text.detail.empty)).toBeInTheDocument();
  });

  it('opens a User in the bottom sheet below the large breakpoint', async () => {
    stubViewport(false);
    serveUsers([bot]);
    serveDetail(botDetail);
    await renderRoute('/admin/users');

    await userEvent.click(await screen.findByRole('row', { name: /spam-bot-42/ }));

    const sheet = await screen.findByRole('dialog');
    expect(await within(sheet).findByRole('heading', { name: 'spam-bot-42' })).toBeInTheDocument();
  });
});
