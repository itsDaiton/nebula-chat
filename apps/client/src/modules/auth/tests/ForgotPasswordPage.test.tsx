import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { API_ROUTE, mockApiError } from '@/test/api';
import { holdSession, mockRequestPasswordReset } from '@/test/auth';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

// The real sign-in page its link leads to, through the router.
const SIGN_IN_PAGE = resources.auth.signIn.title;
const { forgotPassword } = resources.auth;

const renderPage = (search = '') => renderRoute(`${route.auth.forgotPassword()}${search}`);

const emailField = () => screen.getByRole('textbox', { name: resources.auth.fields.email });
const submit = () => userEvent.click(screen.getByRole('button', { name: forgotPassword.submit }));

beforeEach(async () => {
  await holdSession({});
});

describe('ForgotPasswordPage', () => {
  it('emails a reset link that leads back to the reset page', async () => {
    let body: unknown;
    server.use(
      mockRequestPasswordReset(async (request) => {
        body = await request.clone().json();
      }),
    );
    await renderPage();

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
    await renderPage();

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
    await renderPage();

    await userEvent.type(emailField(), 'not-an-email');
    await submit();

    await waitFor(() =>
      expect(emailField()).toHaveAccessibleErrorMessage(resources.auth.validation.emailInvalid),
    );
    expect(requests).toBe(0);
  });

  it('reports a failure above the form', async () => {
    server.use(mockApiError('post', API_ROUTE.authRequestPasswordReset, 500));
    await renderPage();

    await userEvent.type(emailField(), 'ada@example.com');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(resources.auth.errors.unknown);
    expect(emailField()).toHaveValue('ada@example.com');
  });

  it('asks the user to wait when reset requests are rate limited', async () => {
    server.use(mockApiError('post', API_ROUTE.authRequestPasswordReset, 429, {}));
    await renderPage();

    await userEvent.type(emailField(), 'ada@example.com');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      resources.auth.errors.tooManyRequests,
    );
  });

  it('leads back to sign in', async () => {
    await renderPage();

    await userEvent.click(screen.getByRole('link', { name: resources.auth.page.backToSignIn }));

    expect(await screen.findByRole('heading', { name: SIGN_IN_PAGE })).toBeInTheDocument();
  });

  it('ignores search params it has no use for', async () => {
    await renderPage(`?token=${encodeURIComponent('{"a":1}')}`);

    expect(emailField()).toBeInTheDocument();
  });
});
