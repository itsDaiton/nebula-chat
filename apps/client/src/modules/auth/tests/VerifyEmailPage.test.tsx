import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@/resources';
import { holdSession, mockSendVerificationEmail } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

// The real chat page its link leads to, through the router's bridge.
const CHAT_PAGE = resources.chat.welcomeMessage;
const { verifyEmail } = resources.auth;

// better-auth redirects the emailed link here, adding `?error=…` when the token is rejected.
const renderPage = async (search: string, session: Parameters<typeof holdSession>[0]) => {
  await holdSession(session);

  await renderRoute(`/auth/verify-email${search}`);
};

const unverified = { isAnonymous: false, emailVerified: false };

beforeEach(() => {
  serveChatPage();
});

describe('VerifyEmailPage', () => {
  it('confirms a verified email and starts a chat', async () => {
    await renderPage('', { isAnonymous: false, emailVerified: true });

    expect(screen.getByRole('heading', { name: verifyEmail.verifiedTitle })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(verifyEmail.verified);

    await userEvent.click(screen.getByRole('link', { name: verifyEmail.startChatting }));

    expect(await screen.findByText(CHAT_PAGE)).toBeInTheDocument();
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
        callbackURL: expect.stringMatching(/\/auth\/verify-email$/),
      }),
    );
  });

  it('explains an invalid link', async () => {
    await renderPage('?error=INVALID_TOKEN', unverified);

    expect(screen.getByRole('alert')).toHaveTextContent(verifyEmail.linkInvalid);
  });

  it('reads a malformed error code as an invalid link, whatever the session says', async () => {
    await renderPage(`?error=${encodeURIComponent('{"code":1}')}`, {
      isAnonymous: false,
      emailVerified: true,
    });

    expect(screen.getByRole('heading', { name: verifyEmail.failedTitle })).toBeInTheDocument();
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
