import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import {
  getGetSessionMockHandler,
  getListSessionsMockHandler,
} from '@/libs/api/generated/sessions/sessions.msw';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import {
  aSession,
  mockAnonymousSignIn,
  mockGetSession,
  mockSignOut,
  refreshSession,
} from '@/test/auth';
import { selectMenuItem } from '@/test/menu';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

const layout = vi.hoisted(() => ({ isMobile: false, showSidePanels: true, showRightPanel: false }));
vi.mock('@/shared/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => layout }));

let session: ReturnType<typeof aSession> | null = aSession();

// Through the real session guard, as the app boots, since sign-out hands the re-mint back to it.
const renderStatus = async (path = '/') => {
  server.use(
    getGetMessageAllowanceMockHandler({ metered: false }),
    getGetSessionMockHandler({
      id: 'abc',
      title: 'Chat',
      createdAt: '2026-06-15T11:00:00.000Z',
      archived: false,
      activeStreamId: null,
      waitingRun: null,
    }),
    getListMessagesMockHandler([]),
  );
  const view = await renderRoute(path, { seedSession: false });
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: resources.auth.loading })).not.toBeInTheDocument(),
  );
  refreshSession();
  return view;
};

beforeEach(() => {
  useSettingsDialogStore.setState({ isOpen: false });
  vi.restoreAllMocks();
  session = aSession();
  server.use(mockGetSession(() => session));
});

const openMenu = async () =>
  userEvent.click(await screen.findByRole('button', { name: resources.userMenu.label }));

// A Registered user's Avatar carries their initials ("Ada" → "A").
const findInitials = () =>
  waitFor(() =>
    expect(
      within(screen.getByRole('button', { name: resources.userMenu.label })).getByText('A'),
    ).toBeInTheDocument(),
  );

const signOutItem = () => screen.findByRole('menuitem', { name: resources.auth.actions.signOut });

describe('AccountStatus', () => {
  it('offers a Guest a sign-in link to the auth page, with no user menu', async () => {
    const { router } = await renderStatus();

    const signIn = await screen.findByRole('link', { name: resources.auth.actions.signIn });
    expect(
      screen.queryByRole('button', { name: resources.userMenu.label }),
    ).not.toBeInTheDocument();

    await userEvent.click(signIn);

    expect(router.state.location.pathname).toBe('/auth');
  });

  it("shows a Registered user's initials, keeping their email out of the bar", async () => {
    session = aSession({ isAnonymous: false });
    await renderStatus();

    await findInitials();

    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
  });

  it("keeps a Registered user's initials showing until their Profile image has loaded", async () => {
    session = aSession({ isAnonymous: false, image: 'https://lh3.googleusercontent.com/a/ada' });
    await renderStatus();

    const trigger = await screen.findByRole('button', { name: resources.userMenu.label });
    // jsdom loads no image, and Base UI mounts the picture only once it has.
    expect(within(trigger).getByText('A')).toBeInTheDocument();
  });

  it("lists a Registered user's name and email, Settings and Sign out", async () => {
    session = aSession({ isAnonymous: false });
    await renderStatus();
    await findInitials();

    await openMenu();

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Ada')).toBeInTheDocument();
    expect(within(menu).getByText('ada@example.com')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: resources.userMenu.settings })).toBeVisible();
    expect(
      within(menu).getByRole('menuitem', { name: resources.auth.actions.signOut }),
    ).toBeVisible();
    expect(
      within(menu).queryByRole('menuitem', { name: resources.auth.actions.signIn }),
    ).not.toBeInTheDocument();
  });

  it('opens Settings for a Registered user', async () => {
    session = aSession({ isAnonymous: false });
    await renderStatus();

    await openMenu();
    await selectMenuItem(
      await screen.findByRole('menuitem', { name: resources.userMenu.settings }),
    );

    await waitFor(() => expect(useSettingsDialogStore.getState().isOpen).toBe(true));
  });

  it('signs out to a fresh Guest on the chat root without fetching as nobody', async () => {
    let signIns = 0;
    let unauthenticatedRequests = 0;
    session = aSession({ isAnonymous: false });
    server.use(
      mockSignOut(() => {
        session = null;
      }),
      mockAnonymousSignIn(() => {
        signIns += 1;
        session = aSession();
      }),
      getListSessionsMockHandler(() => {
        if (!session) unauthenticatedRequests += 1;
        return { sessions: [], nextCursor: null, hasMore: false };
      }),
    );
    await renderStatus('/s/abc');

    await openMenu();
    await selectMenuItem(await signOutItem());

    // Sign-out, a fresh Guest and the root's first render chain several requests.
    expect(
      await screen.findByText(resources.chat.guestHint, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: resources.auth.actions.signIn }),
    ).toBeInTheDocument();
    expect(signIns).toBe(1);
    expect(unauthenticatedRequests).toBe(0);
  });

  it('falls back to the session error when no Guest can be minted after signing out', async () => {
    session = aSession({ isAnonymous: false });
    server.use(
      mockSignOut(() => {
        session = null;
      }),
      mockApiError('post', API_ROUTE.authSignInAnonymous, 500),
    );
    await renderStatus();

    await openMenu();
    await selectMenuItem(await signOutItem());

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.sessionFailed);
  });

  it('reports a failed sign-out and stays signed in', async () => {
    const toast = vi.spyOn(toaster, 'create');
    session = aSession({ isAnonymous: false });
    server.use(mockApiError('post', API_ROUTE.authSignOut, 500));
    await renderStatus();

    await openMenu();
    await selectMenuItem(await signOutItem());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: resources.auth.errors.unknown }),
      ),
    );
    await openMenu();
    expect(await signOutItem()).toBeInTheDocument();
  });
});
