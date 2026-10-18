import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInput } from '@/modules/chat/components/ChatInput';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useModelSelectorStore } from '@/modules/chat/stores/useModelSelectorStore';
import { renderWithChakra } from '@/test/render';

const baseProps = {
  onSendMessage: vi.fn(),
  selectedModel: 'gpt-4o-mini',
  onModelChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  useMessageStore.setState({ message: '' });
  useModelSelectorStore.setState({ isSelectOpen: false, triggerWidth: 120 });
});

describe('ChatInput', () => {
  it('renders a textbox for the message', () => {
    renderWithChakra(<ChatInput {...baseProps} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('writes typed text into the message store', async () => {
    renderWithChakra(<ChatInput {...baseProps} />);

    await userEvent.type(screen.getByRole('textbox'), 'hi');

    expect(useMessageStore.getState().message).toBe('hi');
  });

  it('sends the message on submit and clears the box', async () => {
    const onSendMessage = vi.fn();
    renderWithChakra(<ChatInput {...baseProps} onSendMessage={onSendMessage} />);
    await userEvent.type(screen.getByRole('textbox'), 'hello');

    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSendMessage).toHaveBeenCalledWith('hello');
    expect(useMessageStore.getState().message).toBe('');
  });

  it('will not send an empty message', async () => {
    const onSendMessage = vi.fn();
    renderWithChakra(<ChatInput {...baseProps} onSendMessage={onSendMessage} />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('blocks sending while a reply is streaming', async () => {
    useMessageStore.setState({ message: 'hello' });
    renderWithChakra(<ChatInput {...baseProps} isLoading />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });
});
