import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatEmptyState } from '@/modules/chat/components/ChatEmptyState';
import { resources } from '@/resources';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';

describe('ChatEmptyState', () => {
  it('greets a Registered user by first name, with the Run hint', async () => {
    server.use(mockGetSession(aSession({ isAnonymous: false })));
    renderWithProviders(<ChatEmptyState sessionId={undefined} />);
    refreshSession();

    expect(
      await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening), Ada$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(resources.chat.hint)).toBeInTheDocument();
  });

  it('greets a Guest without a name and points them at signing up', async () => {
    server.use(mockGetSession(aSession()));
    renderWithProviders(<ChatEmptyState sessionId={undefined} />);
    refreshSession();

    expect(
      await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening)$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(resources.chat.guestHint)).toBeInTheDocument();
  });

  it('shows the empty-session copy for an existing session', () => {
    renderWithProviders(<ChatEmptyState sessionId="c1" />);

    expect(screen.getByText(resources.chat.emptySession)).toBeInTheDocument();
    expect(screen.getByText(resources.chat.emptySessionHint)).toBeInTheDocument();
  });
});
