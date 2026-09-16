import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInputBar } from '@/modules/chat/components/ChatInputBar';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useModelSelectorStore } from '@/modules/chat/stores/useModelSelectorStore';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  vi.clearAllMocks();
  useMessageStore.setState({ message: '' });
  useModelSelectorStore.setState({ isSelectOpen: false, triggerWidth: 120 });
});

describe('ChatInputBar', () => {
  it('renders the composer', () => {
    renderWithChakra(
      <ChatInputBar
        onSend={vi.fn()}
        isLoading={false}
        selectedModel="gpt-4o-mini"
        onModelChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('forwards a sent message to onSend', async () => {
    const onSend = vi.fn();
    renderWithChakra(
      <ChatInputBar
        onSend={onSend}
        isLoading={false}
        selectedModel="gpt-4o-mini"
        onModelChange={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByRole('textbox'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith('hello');
  });
});
