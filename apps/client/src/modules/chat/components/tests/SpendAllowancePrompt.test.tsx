import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGetSpendAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { SpendAllowancePrompt } from '@/modules/chat/components/SpendAllowancePrompt';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { resources } from '@/resources';
import { aCappedSpendAllowance } from '@/test/allowance';
import { holdSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderInRouter } from '@/test/renderRoute';

const { spendAllowance } = resources.chat;

beforeEach(() => {
  useChatStreamStore.setState({ isSpendAllowanceReached: false });
});

describe('SpendAllowancePrompt', () => {
  it('explains the refusal and names the reset date once the allowance is spent', async () => {
    server.use(getGetSpendAllowanceMockHandler(aCappedSpendAllowance(0)));
    await holdSession({ isAnonymous: false, emailVerified: true });
    await renderInRouter(<SpendAllowancePrompt />);

    const prompt = await screen.findByRole('alert');
    expect(prompt).toHaveTextContent(spendAllowance.title);
    expect(prompt).toHaveTextContent('Sending resumes Dec 1.');
  });

  it('shows after a refused send even while the read still says money is left', async () => {
    server.use(getGetSpendAllowanceMockHandler(aCappedSpendAllowance(0.5)));
    useChatStreamStore.setState({ isSpendAllowanceReached: true });
    await holdSession({ isAnonymous: false, emailVerified: true });
    await renderInRouter(<SpendAllowancePrompt />);

    expect(await screen.findByRole('alert')).toHaveTextContent(spendAllowance.title);
  });

  it('stays hidden while there is allowance left', async () => {
    server.use(getGetSpendAllowanceMockHandler(aCappedSpendAllowance(0.5)));
    await holdSession({ isAnonymous: false, emailVerified: true });
    await renderInRouter(<SpendAllowancePrompt />);

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
