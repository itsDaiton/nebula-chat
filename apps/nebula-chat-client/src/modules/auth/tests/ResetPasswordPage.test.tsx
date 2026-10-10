import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ResetPasswordPage } from '@/modules/auth/ResetPasswordPage';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { API_ROUTE, mockApiError } from '@/test/api';
import { mockResetPassword } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

const SIGN_IN_PAGE = 'sign-in page';
const FORGOT_PASSWORD_PAGE = 'forgot-password page';
const { resetPassword } = resources.auth;

// better-auth redirects the emailed link here with `?token=…`, or `?error=INVALID_TOKEN`.
const renderPage = (search: string) =>
  renderWithChakra(
    <Routes>
      <Route path={route.auth.resetPassword()} element={<ResetPasswordPage />} />
      <Route path={route.auth.root()} element={SIGN_IN_PAGE} />
      <Route path={route.auth.forgotPassword()} element={FORGOT_PASSWORD_PAGE} />
    </Routes>,
    { route: `${route.auth.resetPassword()}${search}` },
  );

// A masked password input has no ARIA role, so it is found by its label.
const passwordField = () => screen.getByLabelText(resources.auth.fields.newPassword);
const confirmPasswordField = () => screen.getByLabelText(resources.auth.fields.confirmNewPassword);
const fillPasswords = async (password: string, confirmation = password) => {
  await userEvent.type(passwordField(), password);
  await userEvent.type(confirmPasswordField(), confirmation);
};
const submit = () => userEvent.click(screen.getByRole('button', { name: resetPassword.submit }));

beforeEach(() => {
  usePasswordVisibilityStore.setState({ isPasswordVisible: false });
});

describe('ResetPasswordPage', () => {
  it("sets the new password with the link's token", async () => {
    let body: unknown;
    server.use(
      mockResetPassword(async (request) => {
        body = await request.clone().json();
      }),
    );
    renderPage('?token=reset-token');

    await fillPasswords('a-new-long-passphrase');
    await submit();

    expect(await screen.findByRole('status')).toHaveTextContent(resetPassword.done);
    expect(body).toEqual({ newPassword: 'a-new-long-passphrase', token: 'reset-token' });
  });

  it('sends the user on to sign in with the new password', async () => {
    server.use(mockResetPassword());
    renderPage('?token=reset-token');

    await fillPasswords('a-new-long-passphrase');
    await submit();
    await screen.findByRole('status');
    await userEvent.click(screen.getByRole('link', { name: resources.auth.page.backToSignIn }));

    expect(screen.getByText(SIGN_IN_PAGE)).toBeInTheDocument();
  });

  it('swaps the form for a new-link offer when the token turns out spent or edited', async () => {
    server.use(
      mockApiError('post', API_ROUTE.authResetPassword, 400, {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      }),
    );
    renderPage('?token=stale-token');

    await fillPasswords('a-new-long-passphrase');
    await submit();

    expect(
      await screen.findByRole('link', { name: resetPassword.requestNewLink }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(resetPassword.linkInvalid);
    expect(screen.queryByLabelText(resources.auth.fields.newPassword)).not.toBeInTheDocument();
  });

  it('refuses the current password under the field, keeping the link usable', async () => {
    server.use(
      mockApiError('post', API_ROUTE.authResetPassword, 400, {
        code: 'PASSWORD_REUSED',
        message: 'Choose a password different from your current one.',
      }),
    );
    renderPage('?token=reset-token');

    await fillPasswords('my-current-passphrase');
    await submit();

    await waitFor(() =>
      expect(passwordField()).toHaveAccessibleErrorMessage(resources.auth.errors.passwordReused),
    );
    expect(screen.getByRole('button', { name: resetPassword.submit })).toBeInTheDocument();
  });

  it('refuses a breached password under the field', async () => {
    server.use(
      mockApiError('post', API_ROUTE.authResetPassword, 400, { code: 'PASSWORD_COMPROMISED' }),
    );
    renderPage('?token=reset-token');

    await fillPasswords('password1234');
    await submit();

    await waitFor(() =>
      expect(passwordField()).toHaveAccessibleErrorMessage(
        resources.auth.errors.passwordCompromised,
      ),
    );
  });

  it('explains a link better-auth already rejected, and offers a new one', async () => {
    renderPage('?error=INVALID_TOKEN');

    expect(screen.getByRole('alert')).toHaveTextContent(resetPassword.linkInvalid);
    expect(screen.queryByLabelText(resources.auth.fields.newPassword)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: resetPassword.requestNewLink }));

    expect(screen.getByText(FORGOT_PASSWORD_PAGE)).toBeInTheDocument();
  });

  it('treats a link with no token as invalid', () => {
    renderPage('');

    expect(screen.getByRole('alert')).toHaveTextContent(resetPassword.linkInvalid);
  });

  it('asks for the new password twice, sending nothing until both match', async () => {
    let requests = 0;
    server.use(
      mockResetPassword(() => {
        requests += 1;
      }),
    );
    renderPage('?token=reset-token');

    await fillPasswords('a-new-long-passphrase', 'a-new-long-passphrasE');
    await submit();

    await waitFor(() =>
      expect(confirmPasswordField()).toHaveAccessibleErrorMessage(
        resources.auth.validation.passwordMismatch,
      ),
    );
    expect(confirmPasswordField()).toHaveAttribute('autocomplete', 'new-password');
    expect(requests).toBe(0);
  });

  it('clears a mismatch when the first password is fixed to match', async () => {
    renderPage('?token=reset-token');

    await fillPasswords('a-new-long-passphrasE', 'a-new-long-passphrase');
    await submit();
    await waitFor(() => expect(confirmPasswordField()).toBeInvalid());

    await userEvent.clear(passwordField());
    await userEvent.type(passwordField(), 'a-new-long-passphrase');

    await waitFor(() => expect(confirmPasswordField()).not.toBeInvalid());
  });

  it('reveals both password fields with one toggle', async () => {
    renderPage('?token=reset-token');

    const [firstToggle] = screen.getAllByRole('button', {
      name: resources.passwordInput.showPassword,
    });
    await userEvent.click(firstToggle!);

    expect(passwordField()).toHaveAttribute('type', 'text');
    expect(confirmPasswordField()).toHaveAttribute('type', 'text');
  });

  it('validates the new password before sending anything', async () => {
    let requests = 0;
    server.use(
      mockResetPassword(() => {
        requests += 1;
      }),
    );
    renderPage('?token=reset-token');

    await fillPasswords('short');
    await submit();

    await waitFor(() =>
      expect(passwordField()).toHaveAccessibleErrorMessage(
        resources.auth.validation.passwordTooShort,
      ),
    );
    expect(requests).toBe(0);
  });
});
