import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { getListConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { AuthPage } from '@/modules/auth/AuthPage';
import { AccountStatus } from '@/modules/auth/components/AccountStatus';
import { ConversationsList } from '@/modules/conversations/components/ConversationsList';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { API_ROUTE, mockApiError } from '@/test/api';
import {
  aSession,
  mockEmailSignIn,
  mockEmailSignUp,
  mockGetSession,
  refreshSession,
} from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

const GUEST_CONVERSATIONS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Trip to Lisbon',
    createdAt: '2026-06-15T11:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Sourdough tips',
    createdAt: '2026-06-14T11:00:00.000Z',
  },
];

// The server's session, which a successful sign-in or sign-up turns Registered.
let session = aSession();
const becomeRegistered = () => {
  session = aSession({ isAnonymous: false });
};

// The chat root stands in for the app: the nav indicator plus the Guest's conversation list.
const renderAuthFlow = (initialRoute = route.auth()) => {
  const view = renderWithChakra(
    <Routes>
      <Route
        path={route.chat.root()}
        element={
          <>
            <AccountStatus />
            <ConversationsList />
          </>
        }
      />
      <Route path={route.auth()} element={<AuthPage />} />
    </Routes>,
    { route: initialRoute },
  );
  refreshSession();
  return view;
};

const fillSignUp = async () => {
  await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));
  await userEvent.type(screen.getByLabelText(resources.auth.fields.name), 'Ada');
  await userEvent.type(screen.getByLabelText(resources.auth.fields.email), 'ada@example.com');
  await userEvent.type(screen.getByLabelText(resources.auth.fields.password), 'hunter22hunter');
};

const fillSignIn = async () => {
  await userEvent.type(screen.getByLabelText(resources.auth.fields.email), 'ada@example.com');
  await userEvent.type(screen.getByLabelText(resources.auth.fields.password), 'hunter22hunter');
};

beforeEach(() => {
  session = aSession();
  server.use(
    mockGetSession(() => session),
    getListConversationsMockHandler({
      conversations: GUEST_CONVERSATIONS,
      nextCursor: null,
      hasMore: false,
    }),
  );
});

describe('AuthPage', () => {
  it('opens on sign-in and offers sign-up on its own tab', async () => {
    renderAuthFlow();

    expect(screen.getByRole('button', { name: resources.auth.actions.signIn })).toBeInTheDocument();
    expect(screen.queryByLabelText(resources.auth.fields.name)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));

    expect(screen.getByLabelText(resources.auth.fields.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: resources.auth.actions.signUp })).toBeInTheDocument();
  });

  it('registers with email and returns to the chat as a Registered user', async () => {
    let body: unknown;
    server.use(
      mockEmailSignUp(async (request) => {
        body = await request.clone().json();
        becomeRegistered();
      }),
    );
    renderAuthFlow();

    await fillSignUp();
    await userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signUp }));

    expect(await screen.findByText(resources.auth.status.registered)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: resources.auth.actions.signOut }),
    ).toBeInTheDocument();
    expect(body).toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'hunter22hunter',
    });
  });

  it('shows a breached password without clearing the form', async () => {
    server.use(
      mockApiError('post', API_ROUTE.authSignUpEmail, 400, {
        code: 'PASSWORD_COMPROMISED',
        message: 'The password you entered has been compromised.',
      }),
    );
    renderAuthFlow();

    await fillSignUp();
    await userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signUp }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      resources.auth.errors.passwordCompromised,
    );
    expect(screen.getByLabelText(resources.auth.fields.name)).toHaveValue('Ada');
    expect(screen.getByLabelText(resources.auth.fields.email)).toHaveValue('ada@example.com');
    expect(screen.getByLabelText(resources.auth.fields.password)).toHaveValue('hunter22hunter');
  });

  it('tells a returning user their email is already registered', async () => {
    server.use(
      mockApiError('post', API_ROUTE.authSignUpEmail, 422, {
        code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      }),
    );
    renderAuthFlow();

    await fillSignUp();
    await userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signUp }));

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.errors.userExists);
  });

  it('signs in with email and returns to the chat as a Registered user', async () => {
    let body: unknown;
    server.use(
      mockEmailSignIn(async (request) => {
        body = await request.clone().json();
        becomeRegistered();
      }),
    );
    renderAuthFlow();

    await fillSignIn();
    await userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signIn }));

    expect(await screen.findByText(resources.auth.status.registered)).toBeInTheDocument();
    expect(body).toMatchObject({ email: 'ada@example.com', password: 'hunter22hunter' });
  });

  it('shows wrong credentials without clearing the form', async () => {
    server.use(
      mockApiError('post', API_ROUTE.authSignInEmail, 401, { code: 'INVALID_EMAIL_OR_PASSWORD' }),
    );
    renderAuthFlow();

    await fillSignIn();
    await userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signIn }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      resources.auth.errors.invalidCredentials,
    );
    expect(screen.getByLabelText(resources.auth.fields.email)).toHaveValue('ada@example.com');
  });

  it('falls back to a generic message for an unrecognised error', async () => {
    server.use(mockApiError('post', API_ROUTE.authSignInEmail, 500, { code: 'SOMETHING_ELSE' }));
    renderAuthFlow();

    await fillSignIn();
    await userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signIn }));

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.errors.unknown);
  });

  it('reports a network failure', async () => {
    server.use(http.post(API_ROUTE.authSignInEmail, () => HttpResponse.error()));
    renderAuthFlow();

    await fillSignIn();
    await userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signIn }));

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.errors.network);
  });

  it("keeps the Guest's conversations after signing in (the claim)", async () => {
    let listRequests = 0;
    server.use(
      getListConversationsMockHandler(() => {
        listRequests += 1;
        return { conversations: GUEST_CONVERSATIONS, nextCursor: null, hasMore: false };
      }),
      mockEmailSignIn(becomeRegistered),
    );
    renderAuthFlow(route.chat.root());

    expect(await screen.findByText('Trip to Lisbon')).toBeInTheDocument();
    expect(await screen.findByText(resources.auth.status.guest)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: resources.auth.actions.signIn }));
    await fillSignIn();
    await userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signIn }));

    expect(await screen.findByText(resources.auth.status.registered)).toBeInTheDocument();
    expect(await screen.findByText('Trip to Lisbon')).toBeInTheDocument();
    expect(screen.getByText('Sourdough tips')).toBeInTheDocument();
    // Re-read for the new account rather than served from the Guest's cache.
    await waitFor(() => expect(listRequests).toBe(2));
  });

  it('lets a visitor go back to the chat as a Guest', async () => {
    renderAuthFlow();

    await userEvent.click(screen.getByRole('link', { name: resources.auth.page.continueAsGuest }));

    expect(await screen.findByText('Trip to Lisbon')).toBeInTheDocument();
  });
});
