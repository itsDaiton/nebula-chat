import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getListConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { AuthPage } from '@/modules/auth/AuthPage';
import { ForgotPasswordPage } from '@/modules/auth/ForgotPasswordPage';
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
  mockSocialSignIn,
  providerConsentUrl,
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
const renderAuthFlow = (initialRoute = route.auth.root()) => {
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
      <Route path={route.auth.root()} element={<AuthPage />} />
      <Route path={route.auth.forgotPassword()} element={<ForgotPasswordPage />} />
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
const confirmPasswordField = () => screen.getByLabelText(resources.auth.fields.confirmPassword);

// Submitting validates, calls the API, refetches the session and navigates: slower than one tick.
// Signed in shows as the account menu's avatar carrying the Registered user's initials.
const findRegisteredMenu = () =>
  waitFor(
    () => {
      const trigger = screen.getByRole('button', { name: resources.userMenu.label });
      expect(within(trigger).getByText('A')).toBeInTheDocument();
      return trigger;
    },
    { timeout: 3000 },
  );

const submitSignIn = () =>
  userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signIn }));
const submitSignUp = () =>
  userEvent.click(screen.getByRole('button', { name: resources.auth.actions.signUp }));

const fillSignUp = async ({
  password = 'hunter22hunter',
  confirmPassword = password,
}: { password?: string; confirmPassword?: string } = {}) => {
  await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));
  await userEvent.type(nameField(), 'Ada');
  await userEvent.type(emailField(), 'ada@example.com');
  await userEvent.type(passwordField(), password);
  await userEvent.type(confirmPasswordField(), confirmPassword);
};

const fillSignIn = async () => {
  await userEvent.type(emailField(), 'ada@example.com');
  await userEvent.type(passwordField(), 'hunter22hunter');
};

const socialButton = (provider: string) => screen.getByRole('button', { name: provider });

beforeEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
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

    expect(screen.getByRole('heading', { name: resources.auth.signIn.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: resources.auth.actions.signIn })).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: resources.auth.fields.name }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));

    expect(screen.getByRole('heading', { name: resources.auth.signUp.title })).toBeInTheDocument();
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

    expect(await findRegisteredMenu()).toBeInTheDocument();
    // The confirmation never leaves the browser.
    expect(body).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'hunter22hunter',
      callbackURL: expect.any(String),
    });
  });

  it('asks for the password twice, sending nothing until both match', async () => {
    let signUps = 0;
    server.use(
      mockEmailSignUp(() => {
        signUps += 1;
      }),
    );
    renderAuthFlow();

    await fillSignUp({ confirmPassword: 'hunter22hunteR' });
    await submitSignUp();

    await waitFor(() =>
      expect(confirmPasswordField()).toHaveAccessibleErrorMessage(
        resources.auth.validation.passwordMismatch,
      ),
    );
    expect(confirmPasswordField()).toHaveAttribute('autocomplete', 'new-password');
    expect(passwordField()).not.toBeInvalid();
    expect(signUps).toBe(0);
  });

  it('clears a mismatch when the first password is fixed to match', async () => {
    renderAuthFlow();

    await fillSignUp({ password: 'hunter22hunteR', confirmPassword: 'hunter22hunter' });
    await submitSignUp();
    await waitFor(() => expect(confirmPasswordField()).toBeInvalid());

    await userEvent.clear(passwordField());
    await userEvent.type(passwordField(), 'hunter22hunter');

    await waitFor(() => expect(confirmPasswordField()).not.toBeInvalid());
  });

  it('does not flag the confirmation before the user has filled it in', async () => {
    renderAuthFlow();
    await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));

    await userEvent.type(passwordField(), 'hunter22hunter');
    await userEvent.click(nameField());
    await userEvent.type(passwordField(), '!');

    expect(confirmPasswordField()).not.toBeInvalid();
  });

  it('reveals both password fields with one toggle', async () => {
    renderAuthFlow();
    await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));

    const [firstToggle] = screen.getAllByRole('button', {
      name: resources.passwordInput.showPassword,
    });
    await userEvent.click(firstToggle!);

    expect(passwordField()).toHaveAttribute('type', 'text');
    expect(confirmPasswordField()).toHaveAttribute('type', 'text');
  });

  it("sends the verification email's link back to the verify page", async () => {
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

    await findRegisteredMenu();
    expect(body).toMatchObject({
      callbackURL: expect.stringMatching(new RegExp(`${route.auth.verifyEmail()}$`)),
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

    expect(await findRegisteredMenu()).toBeInTheDocument();
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

    await userEvent.click(await screen.findByRole('link', { name: resources.auth.actions.signIn }));
    expect(
      await screen.findByRole('heading', { name: resources.auth.signIn.title }),
    ).toBeInTheDocument();
    await fillSignIn();
    await submitSignIn();

    expect(await findRegisteredMenu()).toBeInTheDocument();
    expect(await screen.findByText('Trip to Lisbon')).toBeInTheDocument();
    expect(screen.getByText('Sourdough tips')).toBeInTheDocument();
    // Re-read for the new account rather than served from the Guest's cache.
    await waitFor(() => expect(listRequests).toBe(2));
  });

  it('offers a password reset from the sign-in form', async () => {
    renderAuthFlow();

    await userEvent.click(screen.getByRole('link', { name: resources.auth.signIn.forgotPassword }));

    expect(
      screen.getByRole('heading', { name: resources.auth.forgotPassword.title }),
    ).toBeInTheDocument();
  });

  it('lets a visitor go back to the chat as a Guest', async () => {
    renderAuthFlow();

    await userEvent.click(
      screen.getByRole('link', { name: resources.auth.page.continueWithoutAccount }),
    );

    expect(await screen.findByText('Trip to Lisbon')).toBeInTheDocument();
  });

  describe('social sign-in', () => {
    const { social } = resources.auth;

    /** Serves `sign-in/social` and returns a reader for the body the client last sent it. */
    const captureSocialSignIn = () => {
      let body: { provider?: string; callbackURL?: string; errorCallbackURL?: string } = {};
      server.use(
        mockSocialSignIn(async (request) => {
          body = (await request.clone().json()) as typeof body;
        }),
      );
      return () => body;
    };

    it('offers Google and GitHub alongside email, on either tab', async () => {
      renderAuthFlow();

      expect(socialButton(social.google)).toBeInTheDocument();
      expect(socialButton(social.github)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('tab', { name: resources.auth.tabs.signUp }));

      expect(socialButton(social.google)).toBeInTheDocument();
      expect(socialButton(social.github)).toBeInTheDocument();
    });

    it.each([
      ['google', social.google],
      ['github', social.github],
    ])('hands off to %s and follows its redirect', async (provider, label) => {
      const sent = captureSocialSignIn();
      renderAuthFlow();

      await userEvent.click(socialButton(label));

      await waitFor(() => expect(window.location.href).toBe(providerConsentUrl()));
      expect(sent()).toMatchObject({ provider });
    });

    it('returns to the chat on success and to this page on failure', async () => {
      const sent = captureSocialSignIn();
      renderAuthFlow();

      await userEvent.click(socialButton(social.google));

      await waitFor(() => expect(sent().callbackURL).toBeDefined());
      expect(new URL(sent().callbackURL ?? '').pathname).toBe(route.chat.root());
      expect(new URL(sent().errorCallbackURL ?? '').pathname).toBe(route.auth.root());
    });

    // The claim itself runs on the server's provider callback; the client only has to reload as the new user.
    it('lands back in the chat signed in, listing their conversations afresh', async () => {
      let listRequests = 0;
      server.use(
        getListConversationsMockHandler(() => {
          listRequests += 1;
          return { conversations: GUEST_CONVERSATIONS, nextCursor: null, hasMore: false };
        }),
      );
      const sent = captureSocialSignIn();
      const view = renderAuthFlow();
      await userEvent.click(socialButton(social.github));
      await waitFor(() => expect(sent().callbackURL).toBeDefined());
      view.unmount();

      // The provider's callback signs the user in on the server, then loads the app afresh.
      becomeRegistered();
      renderAuthFlow(new URL(sent().callbackURL ?? '').pathname);

      expect(await findRegisteredMenu()).toBeInTheDocument();
      expect(await screen.findByText('Trip to Lisbon')).toBeInTheDocument();
      expect(screen.getByText('Sourdough tips')).toBeInTheDocument();
      expect(listRequests).toBe(1);
    });

    it('says when a provider is not available', async () => {
      server.use(
        mockApiError('post', API_ROUTE.authSignInSocial, 404, { code: 'PROVIDER_NOT_FOUND' }),
      );
      renderAuthFlow();

      await userEvent.click(socialButton(social.github));

      expect(await screen.findByRole('alert')).toHaveTextContent(social.errors.unavailable);
      expect(socialButton(social.github)).toBeEnabled();
    });

    it.each([
      ['access_denied', social.errors.cancelled],
      ['account_not_linked', social.errors.accountNotLinked],
      ['email_not_found', social.errors.emailNotFound],
      ['state_not_found', social.errors.failed],
    ])('explains a %s returned by the provider callback', async (error, message) => {
      renderAuthFlow(`${route.auth.root()}?error=${error}`);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
    });

    it("drops the last callback's error once the user tries again", async () => {
      captureSocialSignIn();
      renderAuthFlow(`${route.auth.root()}?error=access_denied`);
      expect(await screen.findByRole('alert')).toBeInTheDocument();

      await userEvent.click(socialButton(social.google));

      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    });
  });
});
