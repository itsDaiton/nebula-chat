import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { RunToggle } from '@/modules/chat/components/RunToggle';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { resources } from '@/resources';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';

beforeEach(() => {
  useMessageStore.setState({ isRunMode: false });
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
});
