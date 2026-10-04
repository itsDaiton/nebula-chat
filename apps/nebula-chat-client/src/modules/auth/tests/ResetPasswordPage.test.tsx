import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ResetPasswordPage } from '@/modules/auth/ResetPasswordPage';
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
const submit = () => userEvent.click(screen.getByRole('button', { name: resetPassword.submit }));

describe('ResetPasswordPage', () => {
  it("sets the new password with the link's token", async () => {
    let body: unknown;
    server.use(
      mockResetPassword(async (request) => {
        body = await request.clone().json();
      }),
    );
    renderPage('?token=reset-token');

    await userEvent.type(passwordField(), 'a-new-long-passphrase');
    await submit();

    expect(await screen.findByRole('status')).toHaveTextContent(resetPassword.done);
    expect(body).toEqual({ newPassword: 'a-new-long-passphrase', token: 'reset-token' });
  });

  it('sends the user on to sign in with the new password', async () => {
    server.use(mockResetPassword());
    renderPage('?token=reset-token');

    await userEvent.type(passwordField(), 'a-new-long-passphrase');
    await submit();
    await screen.findByRole('status');
    await userEvent.click(screen.getByRole('link', { name: resources.auth.page.backToSignIn }));

    expect(screen.getByText(SIGN_IN_PAGE)).toBeInTheDocument();
  });

  it('explains a token that expired or was already used', async () => {
    server.use(
      mockApiError('post', API_ROUTE.authResetPassword, 400, {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      }),
    );
    renderPage('?token=stale-token');

    await userEvent.type(passwordField(), 'a-new-long-passphrase');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      resources.auth.errors.resetLinkInvalid,
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

  it('validates the new password before sending anything', async () => {
    let requests = 0;
    server.use(
      mockResetPassword(() => {
        requests += 1;
      }),
    );
    renderPage('?token=reset-token');

    await userEvent.type(passwordField(), 'short');
    await submit();

    await waitFor(() =>
      expect(passwordField()).toHaveAccessibleErrorMessage(
        resources.auth.validation.passwordTooShort,
      ),
    );
    expect(requests).toBe(0);
  });
});
