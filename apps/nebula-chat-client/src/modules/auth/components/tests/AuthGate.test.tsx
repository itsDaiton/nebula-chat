import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { AuthGate } from '@/modules/auth/components/AuthGate';
import { resources } from '@/resources';
import { API_ROUTE } from '@/test/api';
import { aSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

const APP = 'app content';

const renderGate = () => renderWithChakra(<AuthGate>{APP}</AuthGate>);

describe('AuthGate', () => {
  it('mints a Guest before rendering when there is no session', async () => {
    let signIns = 0;
    let hasGuest = false;
    server.use(
      http.get(API_ROUTE.authSession, () => HttpResponse.json(hasGuest ? aSession() : null)),
      http.post(API_ROUTE.authSignInAnonymous, () => {
        signIns += 1;
        hasGuest = true;
        return HttpResponse.json({ token: 'token-1', user: aSession().user });
      }),
    );

    renderGate();

    expect(await screen.findByText(APP)).toBeInTheDocument();
    expect(signIns).toBe(1);
  });

  it('renders without minting a second Guest when a session exists', async () => {
    let signIns = 0;
    server.use(
      http.get(API_ROUTE.authSession, () => HttpResponse.json(aSession())),
      http.post(API_ROUTE.authSignInAnonymous, () => {
        signIns += 1;
        return HttpResponse.json({ token: 'token-1', user: aSession().user });
      }),
    );

    renderGate();

    expect(await screen.findByText(APP)).toBeInTheDocument();
    expect(signIns).toBe(0);
  });

  it('holds the app behind a loading state until the session resolves', () => {
    server.use(http.get(API_ROUTE.authSession, () => HttpResponse.json(aSession())));

    renderGate();

    expect(screen.getByRole('status', { name: resources.auth.loading })).toBeInTheDocument();
    expect(screen.queryByText(APP)).not.toBeInTheDocument();
  });

  it('sends the session cookie on the auth requests', async () => {
    const credentials: RequestCredentials[] = [];
    server.use(
      http.get(API_ROUTE.authSession, ({ request }) => {
        credentials.push(request.credentials);
        return HttpResponse.json(null);
      }),
      http.post(API_ROUTE.authSignInAnonymous, ({ request }) => {
        credentials.push(request.credentials);
        return HttpResponse.json({ token: 'token-1', user: aSession().user });
      }),
    );

    renderGate();

    await screen.findByText(APP);
    expect(credentials).toEqual(['include', 'include']);
  });

  it('shows an error instead of the app when no session can be established', async () => {
    server.use(
      http.get(API_ROUTE.authSession, () => HttpResponse.json(null)),
      http.post(API_ROUTE.authSignInAnonymous, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

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
