import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGetSessionMockHandler,
  getListSessionsMockHandler,
} from '@/libs/api/generated/sessions/sessions.msw';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { resources } from '@/resources';
import { useSearchStore } from '@/shared/stores/useSearchStore';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const layout = vi.hoisted(() => ({ isMobile: false, showSidePanels: true, showRightPanel: false }));
vi.mock('@/shared/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => layout }));

const NOW = new Date('2026-06-15T12:00:00.000Z');
const HOUR = 3_600_000;
const FIRST = '11111111-1111-4111-8111-111111111111';
const SECOND = '22222222-2222-4222-8222-222222222222';

const aListedSession = (id: string, title: string, msAgo: number) => ({
  id,
  title,
  createdAt: new Date(NOW.getTime() - msAgo).toISOString(),
  archived: false,
});

const sessions = [
  aListedSession(FIRST, 'Run events in the SSE parser', 2 * 60_000),
  aListedSession(SECOND, 'BullMQ vs Redis Streams', 3 * HOUR),
];

let listed = sessions;

const serveSessions = () =>
  server.use(
    getListSessionsMockHandler(() => ({ sessions: listed, nextCursor: null, hasMore: false })),
    getGetSessionMockHandler({
      id: FIRST,
      title: sessions[0].title,
      createdAt: sessions[0].createdAt,
      archived: false,
      activeStreamId: null,
      waitingRun: null,
    }),
    getListMessagesMockHandler([]),
    getGetMessageAllowanceMockHandler({ metered: false }),
  );

/** Answers the archive route and removes the Session from the list the server then serves. */
const serveArchive = (onRequest: (id: string) => void = () => {}) =>
  server.use(
    http.post('*/api/sessions/:sessionId/archive', ({ params }) => {
      const id = String(params.sessionId);
      onRequest(id);
      listed = listed.filter((session) => session.id !== id);
      return HttpResponse.json({
        ...sessions.find((session) => session.id === id),
        archived: true,
      });
    }),
  );

/** Through the real session guard, so each test's user replaces the one better-auth's store still holds. */
const renderPanel = async (path = '/', user = aSession({ isAnonymous: false })) => {
  server.use(mockGetSession(user));
  const view = await renderRoute(path, { seedSession: false });
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: resources.auth.loading })).not.toBeInTheDocument(),
  );
  refreshSession();
  return view;
};

const panel = () => within(document.querySelector('aside') as HTMLElement);

const rowFor = (title: string) => screen.getByRole('link', { name: new RegExp(title) });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  localStorage.clear();
  layout.isMobile = false;
  layout.showSidePanels = true;
  usePanelStore.setState({ leftOpen: true, rightOpen: false, sheetOpen: false });
  listed = sessions;
  toast.dismiss();
  useSearchStore.setState({ isSearchOpen: false });
  serveSessions();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the left panel', () => {
  it('lists the navigation rows with their keyboard hints and the Soon labels', async () => {
    await renderPanel();

    expect(await panel().findByRole('button', { name: /New chat/ })).toHaveTextContent('E');
    expect(panel().getByRole('button', { name: /Search/ })).toHaveTextContent('K');
    expect(screen.getByText('Files').closest('[aria-disabled]')).toHaveTextContent('soon');
    expect(screen.getByText('AI Studio').closest('[aria-disabled]')).toHaveTextContent('soon');
    expect(document.querySelectorAll('aside kbd').length).toBeGreaterThanOrEqual(4);
  });

  it('opens the search from the Search row', async () => {
    await renderPanel();

    await userEvent.click(await panel().findByRole('button', { name: /Search/ }));

    expect(await screen.findByPlaceholderText(resources.commandPalette.placeholder)).toBeVisible();
  });

  it('shows the Sessions heading with its count and each compact relative time', async () => {
    await renderPanel();

    await screen.findByText(sessions[0].title);
    expect(screen.getByText(resources.sidebar.sessions)).toBeInTheDocument();
    expect(screen.getByLabelText(resources.sidebar.count)).toHaveTextContent('2');
    expect(within(rowFor(sessions[0].title)).getByText('2m')).toBeInTheDocument();
    expect(within(rowFor(sessions[1].title)).getByText('3h')).toBeInTheDocument();
  });

  it('keeps the times moving as time passes', async () => {
    await renderPanel();
    await screen.findByText(sessions[0].title);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    await waitFor(() =>
      expect(within(rowFor(sessions[0].title)).getByText('3m')).toBeInTheDocument(),
    );
  });
});

describe('archiving a Session', () => {
  it('removes it at once, tells the server and offers an undo', async () => {
    const archived = vi.fn();
    serveArchive(archived);
    await renderPanel();
    await screen.findByText(sessions[1].title);

    await userEvent.click(
      screen.getByRole('button', { name: `${resources.sessions.archive} ${sessions[1].title}` }),
    );

    await waitFor(() => expect(screen.queryByText(sessions[1].title)).not.toBeInTheDocument());
    await waitFor(() => expect(archived).toHaveBeenCalledWith(SECOND));
    expect(await screen.findByText(new RegExp(`${sessions[1].title}.*archived`))).toBeVisible();
  });

  it('brings the Session back when the user undoes it', async () => {
    const restored = vi.fn();
    serveArchive();
    server.use(
      http.post('*/api/sessions/:sessionId/restore', ({ params }) => {
        restored(String(params.sessionId));
        listed = sessions;
        return HttpResponse.json({ ...sessions[1], archived: false });
      }),
    );
    await renderPanel();
    await screen.findByText(sessions[1].title);
    await userEvent.click(
      screen.getByRole('button', { name: `${resources.sessions.archive} ${sessions[1].title}` }),
    );

    await userEvent.click(await screen.findByRole('button', { name: resources.sessions.undo }));

    await waitFor(() => expect(restored).toHaveBeenCalledWith(SECOND));
    expect(await screen.findByText(sessions[1].title)).toBeInTheDocument();
  });

  it('puts the Session back and tells the user when the server refuses', async () => {
    server.use(
      http.post('*/api/sessions/:sessionId/archive', () =>
        HttpResponse.json(
          { error: { code: 'Internal', message: 'Could not archive' } },
          { status: 500 },
        ),
      ),
    );
    await renderPanel();
    await screen.findByText(sessions[1].title);

    await userEvent.click(
      screen.getByRole('button', { name: `${resources.sessions.archive} ${sessions[1].title}` }),
    );

    expect(await screen.findByText(sessions[1].title)).toBeInTheDocument();
    expect(await screen.findByText(/Could not archive|went wrong/i)).toBeVisible();
  });

  it('opens a new chat when the open Session is the one archived', async () => {
    serveArchive();
    const { router } = await renderPanel(`/s/${FIRST}`);
    await panel().findByText(sessions[0].title);

    await userEvent.click(
      screen.getByRole('button', { name: `${resources.sessions.archive} ${sessions[0].title}` }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});

describe('the account footer', () => {
  it('shows a Registered user with their name and status', async () => {
    await renderPanel();

    const footer = await screen.findByRole('button', { name: resources.userMenu.label });
    expect(footer).toHaveTextContent('Ada');
    expect(footer).toHaveTextContent(resources.account.registered);
  });

  it('shows an Admin with the two-factor badge', async () => {
    await renderPanel('/', aSession({ isAnonymous: false, role: 'admin', twoFactorEnabled: true }));

    const footer = await screen.findByRole('button', { name: resources.userMenu.label });
    await waitFor(() => expect(footer).toHaveTextContent(resources.account.admin));
    expect(footer).toHaveTextContent(resources.account.twoFactor);
  });

  it('offers a Guest Sign in and Sign up instead of a menu', async () => {
    await renderPanel('/', aSession());

    expect(await screen.findByRole('link', { name: resources.auth.actions.signIn })).toBeVisible();
    expect(screen.getByRole('link', { name: resources.auth.actions.signUp })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: resources.userMenu.label }),
    ).not.toBeInTheDocument();
  });

  it('lists Settings and Sign out in the menu', async () => {
    await renderPanel();

    await userEvent.click(await screen.findByRole('button', { name: resources.userMenu.label }));

    expect(
      await screen.findByRole('menuitem', { name: resources.userMenu.settings }),
    ).toBeVisible();
    expect(screen.getByRole('menuitem', { name: resources.auth.actions.signOut })).toBeVisible();
  });
});
