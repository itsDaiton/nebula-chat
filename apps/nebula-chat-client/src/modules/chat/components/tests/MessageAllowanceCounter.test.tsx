import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import type { MessageAllowance } from '@/libs/api/generated/model/messageAllowance';
import { MessageAllowanceCounter } from '@/modules/chat/components/MessageAllowanceCounter';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { API_ROUTE } from '@/test/api';
import { aSession, holdSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

const AUTH_PAGE = 'auth page';
const { messageAllowance } = resources.chat;

const GUEST = { isAnonymous: true };
const UNVERIFIED = { isAnonymous: false, emailVerified: false };
const VERIFIED = { isAnonymous: false, emailVerified: true };

const metered = (remaining: number, limit = 10): MessageAllowance => ({
  metered: true,
  limit,
  used: limit - remaining,
  remaining,
});

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

  renderWithChakra(
    <Routes>
      <Route path={route.chat.root()} element={<MessageAllowanceCounter />} />
      <Route path={route.auth.root()} element={AUTH_PAGE} />
    </Routes>,
  );
};

beforeEach(() => {
  vi.restoreAllMocks();
  useChatStreamStore.setState({ isMessageAllowanceReached: false });
});

describe('MessageAllowanceCounter', () => {
  it('tells a Guest how many of their messages are left', async () => {
    serveAllowance(metered(7));
    await renderCounter(GUEST);

    expect(await screen.findByRole('status')).toHaveTextContent('7 of 10 messages left');
  });

  it('shows a Guest on their first visit the full allowance', async () => {
    serveAllowance(metered(10));
    await renderCounter(GUEST);

    expect(await screen.findByRole('status')).toHaveTextContent('10 of 10 messages left');
  });

  it('uses the singular for one message left', async () => {
    serveAllowance(metered(1));
    await renderCounter(GUEST);

    expect(await screen.findByRole('status')).toHaveTextContent('1 of 10 message left');
  });

  it('shows an unverified Registered user the same count', async () => {
    serveAllowance(metered(6));
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

  it('offers a Guest running low a way to sign up', async () => {
    serveAllowance(metered(3));
    await renderCounter(GUEST);

    await userEvent.click(await screen.findByRole('link', { name: messageAllowance.signUp }));

    expect(screen.getByText(AUTH_PAGE)).toBeInTheDocument();
  });

  it('offers no sign-up while plenty is left', async () => {
    serveAllowance(metered(4));
    await renderCounter(GUEST);

    await screen.findByRole('status');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('scales the low state with a different configured cap', async () => {
    serveAllowance(metered(30, 100));
    await renderCounter(GUEST);

    expect(await screen.findByRole('status')).toHaveTextContent('30 of 100 messages left');
    expect(screen.getByRole('link', { name: messageAllowance.signUp })).toBeInTheDocument();
  });

  it('is quiet above the low threshold of a different cap', async () => {
    serveAllowance(metered(31, 100));
    await renderCounter(GUEST);

    await screen.findByRole('status');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('leaves the resend action to the verify-email reminder for an unverified user running low', async () => {
    serveAllowance(metered(2));
    await renderCounter(UNVERIFIED);

    expect(await screen.findByRole('status')).toHaveTextContent('2 of 10 messages left');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('gives way to the wall once the allowance is spent', async () => {
    const reads = serveAllowance(metered(0));
    await renderCounter(GUEST);

    await waitFor(() => expect(reads.count).toBe(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('gives way to the wall after a refused send', async () => {
    serveAllowance(metered(5));
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    await renderCounter(GUEST);

    await new Promise((resolve) => setTimeout(resolve, 50));
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
      getGetMessageAllowanceMockHandler(() => (isVerified ? { metered: false } : metered(5))),
    );
    renderWithChakra(<MessageAllowanceCounter />);
    expect(await screen.findByRole('status')).toHaveTextContent('5 of 10 messages left');

    isVerified = true;
    refreshSession();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});
