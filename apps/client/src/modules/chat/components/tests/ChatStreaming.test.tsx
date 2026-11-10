import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatStreaming } from '@/modules/chat/components/ChatStreaming';
import { renderWithProviders } from '@/test/render';
import { WAITING_PHRASES } from '@/waitingPhrases';

describe('ChatStreaming', () => {
  it('exposes one stable label and hides the rotating phrase from assistive technology', () => {
    renderWithProviders(<ChatStreaming />);

    expect(screen.getByRole('status', { name: 'Waiting for reply' })).toBeInTheDocument();
    const phrase = WAITING_PHRASES.find((candidate) => screen.queryByText(candidate));
    expect(phrase).toBeDefined();
    expect(screen.getByText(phrase as string)).toHaveAttribute('aria-hidden', 'true');
  });
});
