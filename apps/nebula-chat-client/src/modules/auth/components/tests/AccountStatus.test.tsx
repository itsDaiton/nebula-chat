import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getListConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { AccountStatus } from '@/modules/auth/components/AccountStatus';
import { AuthGate } from '@/modules/auth/components/AuthGate';
import { ConversationsList } from '@/modules/conversations/components/ConversationsList';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
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
import { renderWithChakra } from '@/test/render';

const AUTH_PAGE = 'auth page';
const CHAT_PAGE = 'chat page';
const SETTINGS_PAGE = 'settings page';

let session: ReturnType<typeof aSession> | null = aSession();

// Behind the real AuthGate, as the app mounts it, since sign-out hands the re-mint back to it.
const renderStatus = async (initialRoute: string = route.chat.root()) => {
  const view = renderWithChakra(
    <AuthGate>
      <Routes>
        <Route
          path={route.chat.root()}
          element={
            <>
              <AccountStatus />
              {CHAT_PAGE}
            </>
          }
        />
        <Route
          path={route.chat.conversation(':id')}
          element={
            <>
              <AccountStatus />
              <ConversationsList />
            </>
          }
        />
        <Route path={route.auth.root()} element={AUTH_PAGE} />
        <Route path={route.settings.root()} element={SETTINGS_PAGE} />
      </Routes>
    </AuthGate>,
    { route: initialRoute },
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: resources.auth.loading })).not.toBeInTheDocument(),
  );
  refreshSession();
  return view;
};

beforeEach(() => {
  vi.restoreAllMocks();
  session = aSession();
  server.use(mockGetSession(() => session));
});

const openMenu = async () =>
  userEvent.click(await screen.findByRole('button', { name: resources.userMenu.label }));

// A Registered user's Avatar carries their initials ("Ada" → "A"); a Guest's never does.
const findInitials = () =>
  waitFor(() =>
    expect(
      within(screen.getByRole('button', { name: resources.userMenu.label })).getByText('A'),
    ).toBeInTheDocument(),
  );

const signOutItem = () => screen.findByRole('menuitem', { name: resources.auth.actions.signOut });

describe('AccountStatus', () => {
  it('gives a Guest a generic avatar menu that offers sign-in', async () => {
    await renderStatus();

    // The Guest's name is "Anonymous", so initials would read "A".
    const trigger = await screen.findByRole('button', { name: resources.userMenu.label });
    expect(within(trigger).queryByText('A')).not.toBeInTheDocument();

    await openMenu();

    expect(await screen.findByText(resources.userMenu.guest)).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: resources.userMenu.settings }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: resources.auth.actions.signOut }),
    ).not.toBeInTheDocument();

    await selectMenuItem(screen.getByRole('menuitem', { name: resources.auth.actions.signIn }));

    expect(await screen.findByText(AUTH_PAGE)).toBeInTheDocument();
  });

  it("shows a Registered user's initials, keeping their email out of the bar", async () => {
    session = aSession({ isAnonymous: false });
    await renderStatus();

    await findInitials();

    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
  });

  it("lists a Registered user's name and email, Settings and Sign out", async () => {
    session = aSession({ isAnonymous: false });
    await renderStatus();
    await findInitials();

    await openMenu();

    const menu = screen.getByRole('menu');
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

  it('takes a Registered user to the settings page', async () => {
    session = aSession({ isAnonymous: false });
    await renderStatus();

    await openMenu();
    await selectMenuItem(
      await screen.findByRole('menuitem', { name: resources.userMenu.settings }),
    );

    expect(await screen.findByText(SETTINGS_PAGE)).toBeInTheDocument();
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
      getListConversationsMockHandler(() => {
        if (!session) unauthenticatedRequests += 1;
        return { conversations: [], nextCursor: null, hasMore: false };
      }),
    );
    await renderStatus(route.chat.conversation('abc'));

    await openMenu();
    await selectMenuItem(await signOutItem());

    expect(await screen.findByText(CHAT_PAGE)).toBeInTheDocument();
    await openMenu();
    expect(
      await screen.findByRole('menuitem', { name: resources.auth.actions.signIn }),
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
