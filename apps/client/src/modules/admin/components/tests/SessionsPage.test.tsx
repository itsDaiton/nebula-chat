import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGetUserMockHandler,
  getListAllSessionsMockHandler,
  getReadSessionMockHandler,
} from '@/libs/api/generated/admin/admin.msw';
import type { AdminSessionDetail } from '@/libs/api/generated/model/adminSessionDetail';
import type { AdminSessionListItem } from '@/libs/api/generated/model/adminSessionListItem';
import type { AdminUserDetail } from '@/libs/api/generated/model/adminUserDetail';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { aSession, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const text = resources.admin.sessions;

const ANNA_ID = '0190a1b2-0000-7000-8000-00000000000a';
const SESSION_ID = '0190a1b2-0000-7000-8000-0000000000a1';
const OTHER_ID = '0190a1b2-0000-7000-8000-0000000000a2';

const owner = { id: ANNA_ID, name: 'Anna Nováková', email: 'anna@example.com' };

const aListed = (overrides: Partial<AdminSessionListItem> = {}): AdminSessionListItem => ({
  id: SESSION_ID,
  title: 'Trip plan for the Dolomites',
  model: 'gpt-4o-mini',
  archived: false,
  messageCount: 6,
  createdAt: '2026-10-25T09:14:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
  owner,
  ...overrides,
});

const detail: AdminSessionDetail = {
  id: SESSION_ID,
  userId: ANNA_ID,
  title: 'Trip plan for the Dolomites',
  model: 'gpt-4o-mini',
  archived: false,
  messageCount: 2,
  createdAt: '2026-10-25T09:14:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
  messages: [
    {
      id: '0190a1b2-0000-7000-8000-0000000000b1',
      sessionId: SESSION_ID,
      role: 'user',
      content: 'Plan me a 4-day hiking trip',
      createdAt: '2026-10-25T09:14:00Z',
    },
    {
      id: '0190a1b2-0000-7000-8000-0000000000b2',
      sessionId: SESSION_ID,
      role: 'assistant',
      content: 'Here is a hut-to-hut plan',
      createdAt: '2026-10-25T09:14:05Z',
    },
  ],
} as AdminSessionDetail;

const anna: AdminUserDetail = {
  id: ANNA_ID,
  email: owner.email,
  name: owner.name,
  status: 'registered',
  twoFactorEnabled: false,
  messagesSent: 612,
  sessionsCount: 41,
  createdAt: '2026-03-12T10:00:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
  ban: null,
  pendingDeletionAt: null,
};

const serveSessions = (sessions: AdminSessionListItem[]) => {
  const queries: URLSearchParams[] = [];
  server.use(
    getListAllSessionsMockHandler(({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return { sessions, nextCursor: null, hasMore: false };
    }),
  );
  return queries;
};

const serveTranscript = () => {
  const reads: string[] = [];
  server.use(
    getReadSessionMockHandler(({ request }) => {
      reads.push(request.url);
      return detail;
    }),
    getGetUserMockHandler(anna),
  );
  return reads;
};

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

describe('Sessions page', () => {
  it('lists Sessions with owner, Model, messages and archived state', async () => {
    const queries = serveSessions([
      aListed(),
      aListed({ id: OTHER_ID, title: 'Old chat', archived: true, messageCount: 2 }),
    ]);

    await renderRoute('/admin/sessions');

    const table = await screen.findByRole('table', { name: text.title });
    const row = await within(table).findByRole('row', { name: /Trip plan/ });
    expect(within(row).getByText('Anna Nováková')).toBeInTheDocument();
    expect(within(row).getByText('gpt-4o-mini')).toBeInTheDocument();
    expect(within(row).getByText('6')).toBeInTheDocument();
    expect(within(row).getByText(text.no)).toBeInTheDocument();
    expect(
      within(within(table).getByRole('row', { name: /Old chat/ })).getByText(text.yes),
    ).toBeInTheDocument();
    expect(Object.fromEntries(queries[0])).toEqual({ limit: '50', order: 'desc' });
  });

  it('sends the URL search and filters to the API and shows them in the toolbar', async () => {
    const queries = serveSessions([]);
    server.use(getGetUserMockHandler(anna));

    await renderRoute(
      `/admin/sessions?q=trip&user=${ANNA_ID}&model=gpt-4o-mini&archived=true&dir=asc`,
    );

    expect(await screen.findByText(text.empty)).toBeInTheDocument();
    expect(Object.fromEntries(queries[0])).toEqual({
      limit: '50',
      search: 'trip',
      userId: ANNA_ID,
      model: 'gpt-4o-mini',
      archived: 'true',
      order: 'asc',
    });
    expect(screen.getByRole('searchbox', { name: text.search })).toHaveValue('trip');
    expect(
      await screen.findByText(new RegExp(`${text.filter.owner}: ${owner.name}`)),
    ).toBeVisible();
  });

  it('searches once typing pauses, writing it to the URL', async () => {
    const queries = serveSessions([aListed()]);
    const { router } = await renderRoute('/admin/sessions');
    await screen.findByRole('table', { name: text.title });

    await userEvent.type(screen.getByRole('searchbox', { name: text.search }), 'trip');

    await waitFor(() => expect(router.state.location.search).toEqual({ q: 'trip' }));
    expect(queries.map((query) => query.get('search'))).toEqual([null, 'trip']);
  });

  it('reverses the order of last activity from its header', async () => {
    serveSessions([aListed()]);
    const { router } = await renderRoute('/admin/sessions');
    await screen.findByRole('table', { name: text.title });

    await userEvent.click(
      screen.getByRole('button', { name: text.sort(text.columns.lastActivity, 'desc') }),
    );

    await waitFor(() => expect(router.state.location.search).toEqual({ dir: 'asc' }));
  });

  it('links the owner to their User detail', async () => {
    serveSessions([aListed()]);
    const { router } = await renderRoute('/admin/sessions');

    await userEvent.click(await screen.findByRole('link', { name: owner.name }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'));
    expect(router.state.location.search).toEqual({ selected: ANNA_ID });
  });

  it('opens a Session read-only and goes back to the same table state', async () => {
    serveSessions([aListed()]);
    serveTranscript();
    const { router } = await renderRoute('/admin/sessions?q=trip&dir=asc');

    await userEvent.click(await screen.findByRole('row', { name: /Trip plan/ }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/admin/sessions/${SESSION_ID}`),
    );
    expect(await screen.findByText('Here is a hut-to-hut plan')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: text.transcript.back }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/sessions'));
    expect(router.state.location.search).toEqual({ q: 'trip', dir: 'asc' });
  });
});

describe('Session transcript', () => {
  it('shows the Messages with the audit notice, the owner and the metadata, and no composer', async () => {
    serveTranscript();

    await renderRoute(`/admin/sessions/${SESSION_ID}`);

    expect(await screen.findByText('Plan me a 4-day hiking trip')).toBeInTheDocument();
    expect(screen.getByText('Here is a hut-to-hut plan')).toBeInTheDocument();
    expect(screen.getByText(text.transcript.notice)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: resources.chat.meta.regenerate })).toBeNull();

    const owned = await screen.findByRole('link', { name: text.panel.openOwner(owner.name) });
    expect(owned).toHaveTextContent(owner.email);
    const panel = screen.getByRole('complementary', { name: resources.shell.inspector });
    expect(within(panel).getByText('gpt-4o-mini')).toBeInTheDocument();
    expect(within(panel).getByText(text.panel.archived)).toBeInTheDocument();
  });

  it('reads the Session once per visit, however often the window regains focus', async () => {
    const reads = serveTranscript();

    await renderRoute(`/admin/sessions/${SESSION_ID}`);
    await screen.findByText('Here is a hut-to-hut plan');
    await screen.findByRole('link', { name: text.panel.openOwner(owner.name) });

    fireEvent.focus(window);
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(reads).toHaveLength(1);
  });

  it('says so when the Session cannot be read', async () => {
    server.use(mockApiError('get', API_ROUTE.adminSession, 404));

    await renderRoute(`/admin/sessions/${SESSION_ID}`);

    expect(await screen.findByRole('alert')).toHaveTextContent(text.transcript.loadFailed);
  });
});
