import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RunToggle } from '@/modules/chat/components/RunToggle';
import { resources } from '@/resources';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';

describe('RunToggle', () => {
  it('is disabled for a Registered user, who is told Runs are coming soon', async () => {
    server.use(mockGetSession(aSession({ isAnonymous: false })));
    renderWithProviders(<RunToggle />);
    refreshSession();

    const toggle = screen.getByRole('button', { name: resources.chat.run.label });
    expect(toggle).toHaveAttribute('aria-disabled', 'true');
    await userEvent.tab();

    expect(toggle).toHaveFocus();
    expect(await screen.findByText(resources.chat.run.soon)).toBeInTheDocument();
  });

  it('explains to a Guest that Runs need an account', async () => {
    server.use(mockGetSession(aSession()));
    renderWithProviders(<RunToggle />);
    refreshSession();

    await userEvent.tab();

    expect(await screen.findByText(resources.chat.run.guest)).toBeInTheDocument();
  });
});
