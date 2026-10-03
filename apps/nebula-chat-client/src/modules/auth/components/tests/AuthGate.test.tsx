import { renderHook, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { AuthGate } from '@/modules/auth/components/AuthGate';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import { aSession, mockAnonymousSignIn, mockGetSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

const APP = 'app content';

const renderGate = () => renderWithChakra(<AuthGate>{APP}</AuthGate>);

describe('AuthGate', () => {
  it('mints a Guest before rendering when there is no session', async () => {
    let signIns = 0;
    server.use(
      mockGetSession(() => (signIns > 0 ? aSession() : null)),
      mockAnonymousSignIn(() => {
        signIns += 1;
      }),
    );

    renderGate();

    expect(await screen.findByText(APP)).toBeInTheDocument();
    expect(signIns).toBe(1);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isGuest).toBe(true));
  });

  it('renders without minting a second Guest when a session exists', async () => {
    let signIns = 0;
    server.use(
      mockGetSession(aSession()),
      mockAnonymousSignIn(() => {
        signIns += 1;
      }),
    );

    renderGate();

    expect(await screen.findByText(APP)).toBeInTheDocument();
    expect(signIns).toBe(0);
  });

  it('holds the app behind a loading state until the session resolves', () => {
    server.use(mockGetSession(aSession()));

    renderGate();

    expect(screen.getByRole('status', { name: resources.auth.loading })).toBeInTheDocument();
    expect(screen.queryByText(APP)).not.toBeInTheDocument();
  });

  it('sends the session cookie on the auth requests', async () => {
    const credentials: { session?: RequestCredentials; signIn?: RequestCredentials } = {};
    server.use(
      mockGetSession((request) => {
        credentials.session = request.credentials;
        return null;
      }),
      mockAnonymousSignIn((request) => {
        credentials.signIn = request.credentials;
      }),
    );

    renderGate();

    await screen.findByText(APP);
    expect(credentials).toEqual({ session: 'include', signIn: 'include' });
  });

  it('shows an error instead of the app when no session can be established', async () => {
    server.use(mockGetSession(null), mockApiError('post', API_ROUTE.authSignInAnonymous, 500));

    renderGate();

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.sessionFailed);
    expect(screen.queryByText(APP)).not.toBeInTheDocument();
  });

  it('shows an error when the session cannot be read', async () => {
    server.use(http.get(API_ROUTE.authSession, () => HttpResponse.error()));

    renderGate();

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.sessionFailed);
  });
});
