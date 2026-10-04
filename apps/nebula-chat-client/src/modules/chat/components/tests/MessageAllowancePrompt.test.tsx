import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { MessageAllowancePrompt } from '@/modules/chat/components/MessageAllowancePrompt';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderHookWithQueryClient, renderWithChakra } from '@/test/render';

const AUTH_PAGE = 'auth page';
const { messageAllowance } = resources.chat;

// The session store is a module singleton, so wait until it holds this test's user.
const renderPrompt = async ({ isAnonymous }: { isAnonymous: boolean }) => {
  server.use(mockGetSession(aSession({ isAnonymous })));
  const auth = renderHookWithQueryClient(() => useAuth());
  refreshSession();
  await waitFor(() => expect(auth.result.current.isGuest).toBe(isAnonymous));

  renderWithChakra(
    <Routes>
      <Route path={route.chat.root()} element={<MessageAllowancePrompt />} />
      <Route path={route.auth()} element={AUTH_PAGE} />
    </Routes>,
  );
};

beforeEach(() => {
  useChatStreamStore.setState({ isMessageAllowanceReached: false });
});

describe('MessageAllowancePrompt', () => {
  it('asks a Guest who reached the allowance to register or sign in', async () => {
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    await renderPrompt({ isAnonymous: true });

    const prompt = await screen.findByRole('alert');
    expect(prompt).toHaveTextContent(messageAllowance.title);
    expect(prompt).toHaveTextContent(messageAllowance.description);
  });

  it('takes the Guest to the auth page', async () => {
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    await renderPrompt({ isAnonymous: true });

    await userEvent.click(await screen.findByRole('link', { name: messageAllowance.action }));

    expect(screen.getByText(AUTH_PAGE)).toBeInTheDocument();
  });

  it('stays hidden until the allowance is reached', async () => {
    await renderPrompt({ isAnonymous: true });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('never shows to a Registered user', async () => {
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    await renderPrompt({ isAnonymous: false });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
