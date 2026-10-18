import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { VerifyEmailPage } from '@/modules/auth/VerifyEmailPage';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { holdSession, mockSendVerificationEmail } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

const CHAT_PAGE = 'chat page';
const { verifyEmail } = resources.auth;

// better-auth redirects the emailed link here, adding `?error=…` when the token is rejected.
const renderPage = async (search: string, session: Parameters<typeof holdSession>[0]) => {
  await holdSession(session);

  renderWithChakra(
    <Routes>
      <Route path={route.auth.verifyEmail()} element={<VerifyEmailPage />} />
      <Route path={route.chat.root()} element={CHAT_PAGE} />
    </Routes>,
    { route: `${route.auth.verifyEmail()}${search}` },
  );
};

const unverified = { isAnonymous: false, emailVerified: false };

describe('VerifyEmailPage', () => {
  it('confirms a verified email and starts a chat', async () => {
    await renderPage('', { isAnonymous: false, emailVerified: true });

    expect(screen.getByRole('heading', { name: verifyEmail.verifiedTitle })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(verifyEmail.verified);

    await userEvent.click(screen.getByRole('link', { name: verifyEmail.startChatting }));

    expect(screen.getByText(CHAT_PAGE)).toBeInTheDocument();
  });

  it('explains an expired link and offers a new one', async () => {
    let body: unknown;
    server.use(
      mockSendVerificationEmail(async (request) => {
        body = await request.clone().json();
      }),
    );
    await renderPage('?error=TOKEN_EXPIRED', unverified);

    expect(screen.getByRole('heading', { name: verifyEmail.failedTitle })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(verifyEmail.linkExpired);

    await userEvent.click(
      screen.getByRole('button', { name: resources.auth.emailVerification.resend }),
    );

    await waitFor(() =>
      expect(body).toEqual({
        email: 'ada@example.com',
        callbackURL: expect.stringMatching(new RegExp(`${route.auth.verifyEmail()}$`)),
      }),
    );
  });

  it('explains an invalid link', async () => {
    await renderPage('?error=INVALID_TOKEN', unverified);

    expect(screen.getByRole('alert')).toHaveTextContent(verifyEmail.linkInvalid);
  });

  it('does not claim success for an email that is still unverified', async () => {
    await renderPage('', unverified);

    expect(screen.getByRole('alert')).toHaveTextContent(verifyEmail.linkInvalid);
  });

  it('offers no resend to a Guest, who has no email to verify', async () => {
    await renderPage('?error=TOKEN_EXPIRED', { isAnonymous: true });

    expect(
      screen.queryByRole('button', { name: resources.auth.emailVerification.resend }),
    ).not.toBeInTheDocument();
  });
});
