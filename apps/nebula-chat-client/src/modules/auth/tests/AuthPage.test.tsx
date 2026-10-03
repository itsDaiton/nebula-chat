import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getListConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { AuthPage } from '@/modules/auth/AuthPage';
import { AccountStatus } from '@/modules/auth/components/AccountStatus';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { ConversationsList } from '@/modules/conversations/components/ConversationsList';
import { toaster } from '@/shared/components/ui/toaster';
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

const nameField = () => screen.getByRole('textbox', { name: resources.auth.fields.name });
const emailField = () => screen.getByRole('textbox', { name: resources.auth.fields.email });
// A masked password input has no ARIA role, so it is found by its label.
const passwordField = () => screen.getByLabelText(resources.auth.fields.password);

// Submitting validates, calls the API, refetches the session and navigates: slower than one tick.
const findSignOut = () =>
  screen.findByRole('button', { name: resources.auth.actions.signOut }, { timeout: 3000 });

const submitSignIn = () =>
  userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signIn }));
const submitSignUp = () =>
  userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signUp }));

const fillSignUp = async ({ password = 'hunter22hunter' } = {}) => {
  await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));
  await userEvent.type(nameField(), 'Ada');
  await userEvent.type(emailField(), 'ada@example.com');
  await userEvent.type(passwordField(), password);
};

const fillSignIn = async () => {
  await userEvent.type(emailField(), 'ada@example.com');
  await userEvent.type(passwordField(), 'hunter22hunter');
};

beforeEach(() => {
  vi.restoreAllMocks();
  usePasswordVisibilityStore.setState({ isPasswordVisible: false });
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
    expect(
      screen.queryByRole('textbox', { name: resources.auth.fields.name }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));

    expect(nameField()).toBeInTheDocument();
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
    await submitSignUp();

    expect(await findSignOut()).toBeInTheDocument();
    expect(body).toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'hunter22hunter',
    });
  });

  it('shows a breached password under the password field without clearing the form', async () => {
    const toast = vi.spyOn(toaster, 'create');
    server.use(
      mockApiError('post', API_ROUTE.authSignUpEmail, 400, {
        code: 'PASSWORD_COMPROMISED',
        message: 'The password you entered has been compromised.',
      }),
    );
    renderAuthFlow();

    await fillSignUp();
    await submitSignUp();

    await waitFor(() =>
      expect(passwordField()).toHaveAccessibleErrorMessage(
        resources.auth.errors.passwordCompromised,
      ),
    );
    expect(passwordField()).toBeInvalid();
    expect(nameField()).toHaveValue('Ada');
    expect(emailField()).toHaveValue('ada@example.com');
    expect(passwordField()).toHaveValue('hunter22hunter');
    // Shown once, where it applies — not repeated as a toast.
    expect(toast).not.toHaveBeenCalled();
  });

  it('shows an email that is already registered under the email field', async () => {
    server.use(
      mockApiError('post', API_ROUTE.authSignUpEmail, 422, {
        code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      }),
    );
    renderAuthFlow();

    await fillSignUp();
    await submitSignUp();

    await waitFor(() =>
      expect(emailField()).toHaveAccessibleErrorMessage(resources.auth.errors.userExists),
    );
  });

  it('validates sign-up fields before sending anything', async () => {
    let signUps = 0;
    server.use(
      mockEmailSignUp(() => {
        signUps += 1;
      }),
    );
    renderAuthFlow();
    await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));

    await userEvent.type(emailField(), 'not-an-email');
    await userEvent.type(passwordField(), 'short');
    await submitSignUp();

    await waitFor(() =>
      expect(nameField()).toHaveAccessibleErrorMessage(resources.auth.validation.nameRequired),
    );
    expect(emailField()).toHaveAccessibleErrorMessage(resources.auth.validation.emailInvalid);
    expect(passwordField()).toHaveAccessibleErrorMessage(
      resources.auth.validation.passwordTooShort,
    );
    expect(signUps).toBe(0);
  });

  it('clears a field error once the value is fixed', async () => {
    renderAuthFlow();

    await submitSignIn();
    await waitFor(() =>
      expect(emailField()).toHaveAccessibleErrorMessage(resources.auth.validation.emailRequired),
    );

    await userEvent.type(emailField(), 'ada@example.com');

    await waitFor(() => expect(emailField()).not.toBeInvalid());
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
    await submitSignIn();

    expect(await findSignOut()).toBeInTheDocument();
    expect(body).toMatchObject({ email: 'ada@example.com', password: 'hunter22hunter' });
  });

  it('requires both fields to sign in', async () => {
    renderAuthFlow();

    await submitSignIn();

    await waitFor(() =>
      expect(emailField()).toHaveAccessibleErrorMessage(resources.auth.validation.emailRequired),
    );
    expect(passwordField()).toHaveAccessibleErrorMessage(
      resources.auth.validation.passwordRequired,
    );
  });

  it('shows wrong credentials above the form without clearing it', async () => {
    server.use(
      mockApiError('post', API_ROUTE.authSignInEmail, 401, { code: 'INVALID_EMAIL_OR_PASSWORD' }),
    );
    renderAuthFlow();

    await fillSignIn();
    await submitSignIn();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      resources.auth.errors.invalidCredentials,
    );
    expect(emailField()).toHaveValue('ada@example.com');
  });

  it('falls back to a generic message for an unrecognised error', async () => {
    server.use(mockApiError('post', API_ROUTE.authSignInEmail, 500, { code: 'SOMETHING_ELSE' }));
    renderAuthFlow();

    await fillSignIn();
    await submitSignIn();

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.errors.unknown);
  });

  it('reports a network failure', async () => {
    server.use(http.post(API_ROUTE.authSignInEmail, () => HttpResponse.error()));
    renderAuthFlow();

    await fillSignIn();
    await submitSignIn();

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.errors.network);
  });

  it('reveals and re-masks the password', async () => {
    renderAuthFlow();
    await userEvent.type(passwordField(), 'hunter22hunter');

    await userEvent.click(
      screen.getByRole('button', { name: resources.passwordInput.showPassword }),
    );

    expect(passwordField()).toHaveAttribute('type', 'text');
    expect(passwordField()).toHaveValue('hunter22hunter');

    await userEvent.click(
      screen.getByRole('button', { name: resources.passwordInput.hidePassword }),
    );

    expect(passwordField()).toHaveAttribute('type', 'password');
  });

  it('masks the password again when switching tabs', async () => {
    renderAuthFlow();
    await userEvent.click(
      screen.getByRole('button', { name: resources.passwordInput.showPassword }),
    );

    await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));

    expect(passwordField()).toHaveAttribute('type', 'password');
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
    await submitSignIn();

    expect(await findSignOut()).toBeInTheDocument();
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
