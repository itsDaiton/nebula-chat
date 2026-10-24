import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import type { MessageAllowance } from '@/libs/api/generated/model/messageAllowance';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import { MessageAllowanceCounter } from '@/modules/chat/components/MessageAllowanceCounter';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';
import { API_ROUTE } from '@/test/api';
import { aSession, holdSession, mockGetSession, refreshSession } from '@/test/auth';
import { aMeteredAllowance } from '@/test/allowance';
import { server } from '@/test/msw';
import { renderInRouter } from '@/test/renderRoute';

const { messageAllowance } = resources.chat;

const GUEST = { isAnonymous: true };
const UNVERIFIED = { isAnonymous: false, emailVerified: false };
const VERIFIED = { isAnonymous: false, emailVerified: true };

/** Serves `allowance` and counts the reads, so a test can assert none was made. */
const serveAllowance = (allowance: MessageAllowance) => {
  const reads = { count: 0 };
  server.use(
    getGetMessageAllowanceMockHandler(() => {
      reads.count += 1;
      return allowance;
    }),
  );
  return reads;
};

const renderCounter = async (session: Parameters<typeof holdSession>[0]) => {
  await holdSession(session);

  return renderInRouter(<MessageAllowanceCounter />);
};

beforeEach(() => {
  vi.restoreAllMocks();
  useChatStreamStore.setState({ isMessageAllowanceReached: false });
});

describe('MessageAllowanceCounter', () => {
  it.each([
    ['how many of their messages are left', 7, '7 of 10 messages left'],
    ['the full allowance on their first visit', 10, '10 of 10 messages left'],
    ['the singular for one message left', 1, '1 of 10 message left'],
  ])('tells a Guest %s', async (_case, remaining, text) => {
    serveAllowance(aMeteredAllowance(remaining));
    await renderCounter(GUEST);

    expect(await screen.findByRole('status')).toHaveTextContent(text);
  });

  it('shows an unverified Registered user the same count', async () => {
    serveAllowance(aMeteredAllowance(6));
    await renderCounter(UNVERIFIED);

    expect(await screen.findByRole('status')).toHaveTextContent('6 of 10 messages left');
  });

  it('shows a verified Registered user nothing, without asking the server', async () => {
    const reads = serveAllowance({ metered: false });
    await renderCounter(VERIFIED);

    // Let a mount-time fetch, were there one, land before asserting there was none.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(reads.count).toBe(0);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('offers a Guest running low a way to register or sign in', async () => {
    serveAllowance(aMeteredAllowance(3));
    const { router } = await renderCounter(GUEST);

    await userEvent.click(await screen.findByRole('link', { name: messageAllowance.action }));

    expect(router.state.location.pathname).toBe('/auth');
  });

  it('offers no sign-up while plenty is left', async () => {
    serveAllowance(aMeteredAllowance(4));
    await renderCounter(GUEST);

    await screen.findByRole('status');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('scales the low state with a different configured cap', async () => {
    serveAllowance(aMeteredAllowance(30, 100));
    await renderCounter(GUEST);

    expect(await screen.findByRole('status')).toHaveTextContent('30 of 100 messages left');
    expect(screen.getByRole('link', { name: messageAllowance.action })).toBeInTheDocument();
  });

  it('is quiet above the low threshold of a different cap', async () => {
    serveAllowance(aMeteredAllowance(31, 100));
    await renderCounter(GUEST);

    await screen.findByRole('status');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('leaves the resend action to the verify-email reminder for an unverified user running low', async () => {
    serveAllowance(aMeteredAllowance(2));
    await renderCounter(UNVERIFIED);

    expect(await screen.findByRole('status')).toHaveTextContent('2 of 10 messages left');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('gives way to the wall once the allowance is spent', async () => {
    const reads = serveAllowance(aMeteredAllowance(0));
    await renderCounter(GUEST);

    await waitFor(() => expect(reads.count).toBe(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('gives way to the wall after a refused send', async () => {
    const reads = serveAllowance(aMeteredAllowance(5));
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    await renderCounter(GUEST);

    await waitFor(() => expect(reads.count).toBe(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders nothing while the allowance loads', async () => {
    server.use(getGetMessageAllowanceMockHandler(() => new Promise<MessageAllowance>(() => {})));
    await renderCounter(GUEST);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders nothing, and reports nothing, when the read fails', async () => {
    const toast = vi.spyOn(toaster, 'create');
    const reads = { count: 0 };
    server.use(
      http.get(API_ROUTE.messageAllowance, () => {
        reads.count += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    await renderCounter(GUEST);

    await waitFor(() => expect(reads.count).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it("drops the previous identity's count once the user is no longer metered", async () => {
    await holdSession(GUEST);
    let isVerified = false;
    server.use(
      mockGetSession(() => aSession(isVerified ? VERIFIED : GUEST)),
      getGetMessageAllowanceMockHandler(() =>
        isVerified ? { metered: false } : aMeteredAllowance(5),
      ),
    );
    await renderInRouter(<MessageAllowanceCounter />);
    expect(await screen.findByRole('status')).toHaveTextContent('5 of 10 messages left');

    isVerified = true;
    refreshSession();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it("shows the new identity's count once a spent Guest signs up", async () => {
    await holdSession(GUEST);
    let isSignedUp = false;
    server.use(
      mockGetSession(() => aSession(isSignedUp ? UNVERIFIED : GUEST)),
      getGetMessageAllowanceMockHandler(() => aMeteredAllowance(isSignedUp ? 10 : 0)),
    );
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    // The sign-up form's own identity change, as the auth page runs it after the session refetch.
    const SignUpFlow = () => {
      const onIdentityChange = useIdentityChange();
      return (
        <>
          <MessageAllowanceCounter />
          <button type="button" onClick={onIdentityChange}>
            sign up
          </button>
        </>
      );
    };
    await renderInRouter(<SignUpFlow />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    isSignedUp = true;
    refreshSession();
    await userEvent.click(screen.getByRole('button', { name: 'sign up' }));

    expect(await screen.findByRole('status')).toHaveTextContent('10 of 10 messages left');
  });
});
