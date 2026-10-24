import { renderHook, screen, waitFor } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import { aSession, mockAnonymousSignIn, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

beforeEach(() => {
  serveChatPage();
});

// The guard bootstraps the session itself here, as it does on a page load.
const visit = (path: string) => renderRoute(path, { seedSession: false });

describe('session guard', () => {
  it('mints a Guest before rendering when a visitor has no session', async () => {
    let signIns = 0;
    server.use(
      mockGetSession(() => (signIns > 0 ? aSession() : null)),
      mockAnonymousSignIn(() => {
        signIns += 1;
      }),
    );

    await visit('/');

    expect(await screen.findByText(resources.chat.welcomeMessage)).toBeInTheDocument();
    expect(signIns).toBe(1);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isGuest).toBe(true));
  });

  it.each([
    ['a Guest', aSession()],
    ['a Registered user', aSession({ isAnonymous: false })],
  ])('renders for %s without minting a second Guest', async (_who, session) => {
    let signIns = 0;
    server.use(
      mockGetSession(session),
      mockAnonymousSignIn(() => {
        signIns += 1;
      }),
    );

    await visit('/');

    expect(await screen.findByText(resources.chat.welcomeMessage)).toBeInTheDocument();
    expect(signIns).toBe(0);
  });

  it('guards the auth pages as well', async () => {
    server.use(mockGetSession(null), mockAnonymousSignIn());

    await visit('/auth');

    expect(
      await screen.findByRole('heading', { name: resources.auth.signIn.title }),
    ).toBeInTheDocument();
  });

  it('holds the app behind a loading state until the session resolves', async () => {
    server.use(
      http.get(API_ROUTE.authSession, async () => {
        await delay(300);
        return HttpResponse.json(aSession());
      }),
    );

    await visit('/');

    expect(await screen.findByRole('status', { name: resources.auth.loading })).toBeInTheDocument();
    expect(screen.queryByText(resources.chat.welcomeMessage)).not.toBeInTheDocument();
    expect(await screen.findByText(resources.chat.welcomeMessage)).toBeInTheDocument();
  });

  it('shows an error instead of the app when no session can be established', async () => {
    server.use(mockGetSession(null), mockApiError('post', API_ROUTE.authSignInAnonymous, 500));

    await visit('/');

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.sessionFailed);
    expect(screen.queryByText(resources.chat.welcomeMessage)).not.toBeInTheDocument();
  });

  it('shows an error when the session cannot be read', async () => {
    server.use(http.get(API_ROUTE.authSession, () => HttpResponse.error()));

    await visit('/');

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.sessionFailed);
  });
});
