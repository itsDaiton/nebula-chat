import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatStarters } from '@/modules/chat/components/ChatStarters';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { resources } from '@/resources';
import { holdSession } from '@/test/auth';
import { renderWithProviders } from '@/test/render';

beforeEach(async () => {
  useMessageStore.setState({ message: '' });
  await holdSession({ isAnonymous: false, emailVerified: true });
});

describe('ChatStarters', () => {
  it('offers four starter prompts from the pool', async () => {
    renderWithProviders(<ChatStarters />);

    const prompts = resources.chat.starters.map(({ prompt }) => prompt);
    const shown = (await screen.findAllByRole('button')).map((button) => button.textContent);
    expect(shown).toHaveLength(4);
    expect(new Set(shown).size).toBe(4);
    for (const prompt of shown) expect(prompts).toContain(prompt);
  });

  it('offers a Guest none', async () => {
    await holdSession({ isAnonymous: true });
    renderWithProviders(<ChatStarters />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('fills the composer with the prompt picked, without sending it', async () => {
    renderWithProviders(<ChatStarters />);
    const [first] = await screen.findAllByRole('button');
    const prompt = first.textContent ?? '';

    await userEvent.click(first);

    expect(useMessageStore.getState().message).toBe(prompt);
  });

  it('clears a starter left in the composer when the chat leaves the screen', async () => {
    const { unmount } = renderWithProviders(<ChatStarters />);
    await userEvent.click((await screen.findAllByRole('button'))[0]!);

    unmount();

    expect(useMessageStore.getState().message).toBe('');
  });

  it('keeps a draft the user has edited when the chat leaves the screen', async () => {
    const { unmount } = renderWithProviders(<ChatStarters />);
    await userEvent.click((await screen.findAllByRole('button'))[0]!);
    useMessageStore.getState().setMessage((message) => `${message} and more`);

    unmount();

    expect(useMessageStore.getState().message).toContain('and more');
  });
});
