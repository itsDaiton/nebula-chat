import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailVerificationPrompt } from '@/modules/auth/components/EmailVerificationPrompt';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { API_ROUTE, mockApiError } from '@/test/api';
import { holdSession, mockSendVerificationEmail } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

const { emailVerification } = resources.auth;

const renderPrompt = async (session: Parameters<typeof holdSession>[0]) => {
  await holdSession(session);

  renderWithChakra(<EmailVerificationPrompt />);
};

const resend = () =>
  userEvent.click(screen.getByRole('button', { name: emailVerification.resend }));

beforeEach(() => {
  vi.restoreAllMocks();
  useChatStreamStore.setState({ isMessageAllowanceReached: false });
});

describe('EmailVerificationPrompt', () => {
  it('asks a Registered user with an unverified email to verify it', async () => {
    await renderPrompt({ isAnonymous: false, emailVerified: false });

    const prompt = screen.getByRole('status');
    expect(prompt).toHaveTextContent(emailVerification.title);
    expect(prompt).toHaveTextContent(emailVerification.description);
  });

  it('tells an unverified user at the message allowance that verifying lifts it', async () => {
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    await renderPrompt({ isAnonymous: false, emailVerified: false });

    const prompt = screen.getByRole('alert');
    expect(prompt).toHaveTextContent(emailVerification.allowanceReachedTitle);
    expect(prompt).toHaveTextContent(emailVerification.allowanceReachedDescription);
    expect(screen.getByRole('button', { name: emailVerification.resend })).toBeInTheDocument();
  });

  it('resends the verification email, returning to the verify page', async () => {
    const toast = vi.spyOn(toaster, 'create');
    let body: unknown;
    server.use(
      mockSendVerificationEmail(async (request) => {
        body = await request.clone().json();
      }),
    );
    await renderPrompt({ isAnonymous: false, emailVerified: false });

    await resend();

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', title: emailVerification.sent }),
      ),
    );
    expect(body).toEqual({
      email: 'ada@example.com',
      callbackURL: expect.stringMatching(new RegExp(`${route.auth.verifyEmail()}$`)),
    });
  });

  it('reports a failed resend', async () => {
    const toast = vi.spyOn(toaster, 'create');
    server.use(mockApiError('post', API_ROUTE.authSendVerificationEmail, 500));
    await renderPrompt({ isAnonymous: false, emailVerified: false });

    await resend();

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', description: resources.auth.errors.unknown }),
      ),
    );
  });

  it('stays hidden once the email is verified', async () => {
    await renderPrompt({ isAnonymous: false, emailVerified: true });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('never shows to a Guest', async () => {
    await renderPrompt({ isAnonymous: true });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
