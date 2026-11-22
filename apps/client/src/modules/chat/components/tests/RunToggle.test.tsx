import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { RunToggle } from '@/modules/chat/components/RunToggle';
import { getGetSessionMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { resources } from '@/resources';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  useMessageStore.setState({ isRunMode: false });
  useChatStreamStore.setState({ sessionId: undefined });
});

const toggle = () => screen.getByRole('button', { name: resources.chat.run.label });

describe('RunToggle', () => {
  it('lets a Registered user switch Run mode on and off for the next message', async () => {
    server.use(mockGetSession(aSession({ isAnonymous: false })));
    renderWithProviders(<RunToggle />);
    refreshSession();
    await waitFor(() => expect(toggle()).not.toHaveAttribute('aria-disabled', 'true'));
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    await userEvent.hover(toggle());
    expect(await screen.findByText(resources.chat.run.hint)).toBeInTheDocument();

    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('explains to a Guest that Runs need an account, and stays off', async () => {
    server.use(mockGetSession(aSession()));
    renderWithProviders(<RunToggle />);
    refreshSession();
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-disabled', 'true'));

    await userEvent.tab();
    expect(toggle()).toHaveFocus();
    expect(await screen.findByText(resources.chat.run.guest)).toBeInTheDocument();

    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows a Session’s Reply mode read-only, with why it cannot change', async () => {
    server.use(mockGetSession(aSession({ isAnonymous: false })));
    useChatStreamStore.setState({ sessionId: SESSION_ID });
    server.use(
      getGetSessionMockHandler({
        id: SESSION_ID,
        title: 'Chat',
        createdAt: '2026-06-15T11:00:00.000Z',
        archived: false,
        archivedAt: null,
        messageCount: 2,
        replyMode: 'run',
        activeStreamId: null,
        waitingRun: null,
      }),
    );
    renderWithProviders(<RunToggle />);
    refreshSession();
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'true'));
    expect(toggle()).toHaveAttribute('aria-disabled', 'true');

    await userEvent.tab();
    expect(await screen.findByText(resources.chat.run.locked)).toBeInTheDocument();

    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a Direct reply Session as off, and locked', async () => {
    server.use(mockGetSession(aSession({ isAnonymous: false })));
    useChatStreamStore.setState({ sessionId: SESSION_ID });
    server.use(
      getGetSessionMockHandler({
        id: SESSION_ID,
        title: 'Chat',
        createdAt: '2026-06-15T11:00:00.000Z',
        archived: false,
        archivedAt: null,
        messageCount: 2,
        replyMode: 'direct',
        activeStreamId: null,
        waitingRun: null,
      }),
    );
    // The toggle was left on from an earlier new chat; the Session's mode wins.
    useMessageStore.setState({ isRunMode: true });
    renderWithProviders(<RunToggle />);
    refreshSession();
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-disabled', 'true'));
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'false'));
  });
});
