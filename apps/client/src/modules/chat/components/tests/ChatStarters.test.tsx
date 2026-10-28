import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatStarters } from '@/modules/chat/components/ChatStarters';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { resources } from '@/resources';
import { renderWithProviders } from '@/test/render';

beforeEach(() => {
  useMessageStore.setState({ message: '' });
});

describe('ChatStarters', () => {
  it('offers four starter prompts', () => {
    renderWithProviders(<ChatStarters />);

    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('fills the composer with the prompt picked, without sending it', async () => {
    const [{ prompt }] = resources.chat.starters;
    renderWithProviders(<ChatStarters />);

    await userEvent.click(screen.getByRole('button', { name: prompt }));

    expect(useMessageStore.getState().message).toBe(prompt);
  });
});
