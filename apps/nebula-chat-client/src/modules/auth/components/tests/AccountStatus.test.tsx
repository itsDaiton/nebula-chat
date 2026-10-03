import { screen, waitFor } from '@testing-library/react';
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
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

const AUTH_PAGE = 'auth page';
const CHAT_PAGE = 'chat page';

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
        <Route path={route.auth()} element={AUTH_PAGE} />
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

describe('AccountStatus', () => {
  it('marks a Guest and links to the auth page', async () => {
    await renderStatus();

    expect(await screen.findByText(resources.auth.status.guest)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: resources.auth.actions.signOut }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: resources.auth.actions.signIn }));

    expect(screen.getByText(AUTH_PAGE)).toBeInTheDocument();
  });

  it('shows a Registered user their email and a sign-out control, without a badge', async () => {
    session = aSession({ isAnonymous: false });
    await renderStatus();

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: resources.auth.actions.signOut }),
    ).toBeInTheDocument();
    expect(screen.queryByText(resources.auth.status.guest)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: resources.auth.actions.signIn }),
    ).not.toBeInTheDocument();
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

    await userEvent.click(
      await screen.findByRole('button', { name: resources.auth.actions.signOut }),
    );

    expect(await screen.findByText(CHAT_PAGE)).toBeInTheDocument();
    expect(await screen.findByText(resources.auth.status.guest)).toBeInTheDocument();
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

    await userEvent.click(
      await screen.findByRole('button', { name: resources.auth.actions.signOut }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.sessionFailed);
  });

  it('reports a failed sign-out and stays signed in', async () => {
    const toast = vi.spyOn(toaster, 'create');
    session = aSession({ isAnonymous: false });
    server.use(mockApiError('post', API_ROUTE.authSignOut, 500));
    await renderStatus();

    await userEvent.click(
      await screen.findByRole('button', { name: resources.auth.actions.signOut }),
    );

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: resources.auth.errors.unknown }),
      ),
    );
    expect(
      screen.getByRole('button', { name: resources.auth.actions.signOut }),
    ).toBeInTheDocument();
  });
});
