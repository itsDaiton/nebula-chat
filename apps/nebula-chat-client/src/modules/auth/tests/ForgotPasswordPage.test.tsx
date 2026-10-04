import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ForgotPasswordPage } from '@/modules/auth/ForgotPasswordPage';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { API_ROUTE, mockApiError } from '@/test/api';
import { mockRequestPasswordReset } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

const SIGN_IN_PAGE = 'sign-in page';
const { forgotPassword } = resources.auth;

const renderPage = () =>
  renderWithChakra(
    <Routes>
      <Route path={route.auth.forgotPassword()} element={<ForgotPasswordPage />} />
      <Route path={route.auth.root()} element={SIGN_IN_PAGE} />
    </Routes>,
    { route: route.auth.forgotPassword() },
  );

const emailField = () => screen.getByRole('textbox', { name: resources.auth.fields.email });
const submit = () => userEvent.click(screen.getByRole('button', { name: forgotPassword.submit }));

describe('ForgotPasswordPage', () => {
  it('emails a reset link that leads back to the reset page', async () => {
    let body: unknown;
    server.use(
      mockRequestPasswordReset(async (request) => {
        body = await request.clone().json();
      }),
    );
    renderPage();

    await userEvent.type(emailField(), 'ada@example.com');
    await submit();

    expect(await screen.findByRole('status')).toHaveTextContent(forgotPassword.sent);
    expect(body).toEqual({
      email: 'ada@example.com',
      redirectTo: expect.stringMatching(new RegExp(`${route.auth.resetPassword()}$`)),
    });
  });

  it('replaces the form with the confirmation once sent', async () => {
    server.use(mockRequestPasswordReset());
    renderPage();

    await userEvent.type(emailField(), 'ada@example.com');
    await submit();

    await screen.findByRole('status');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('validates the email before sending anything', async () => {
    let requests = 0;
    server.use(
      mockRequestPasswordReset(() => {
        requests += 1;
      }),
    );
    renderPage();

    await userEvent.type(emailField(), 'not-an-email');
    await submit();

    await waitFor(() =>
      expect(emailField()).toHaveAccessibleErrorMessage(resources.auth.validation.emailInvalid),
    );
    expect(requests).toBe(0);
  });

  it('reports a failure above the form', async () => {
    server.use(mockApiError('post', API_ROUTE.authRequestPasswordReset, 500));
    renderPage();

    await userEvent.type(emailField(), 'ada@example.com');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.errors.unknown);
    expect(emailField()).toHaveValue('ada@example.com');
  });

  it('leads back to sign in', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('link', { name: resources.auth.page.backToSignIn }));

    expect(screen.getByText(SIGN_IN_PAGE)).toBeInTheDocument();
  });
});
