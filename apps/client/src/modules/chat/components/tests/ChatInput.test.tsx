import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInput } from '@/modules/chat/components/ChatInput';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { renderWithProviders } from '@/test/render';

const baseProps = {
  onSendMessage: vi.fn(),
  selectedModel: 'gpt-4o-mini',
  onModelChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  useMessageStore.setState({ message: '' });
});

describe('ChatInput', () => {
  it('renders a textbox for the message', () => {
    renderWithProviders(<ChatInput {...baseProps} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('writes typed text into the message store', async () => {
    renderWithProviders(<ChatInput {...baseProps} />);

    await userEvent.type(screen.getByRole('textbox'), 'hi');

    expect(useMessageStore.getState().message).toBe('hi');
  });

  it('sends the message on submit and clears the box', async () => {
    const onSendMessage = vi.fn();
    renderWithProviders(<ChatInput {...baseProps} onSendMessage={onSendMessage} />);
    await userEvent.type(screen.getByRole('textbox'), 'hello');

    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSendMessage).toHaveBeenCalledWith('hello');
    expect(useMessageStore.getState().message).toBe('');
  });

  it('will not send an empty message', async () => {
    const onSendMessage = vi.fn();
    renderWithProviders(<ChatInput {...baseProps} onSendMessage={onSendMessage} />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('offers to stop the reply while it streams, in place of sending', async () => {
    const onStop = vi.fn();
    useMessageStore.setState({ message: 'hello' });
    renderWithProviders(<ChatInput {...baseProps} isLoading onStop={onStop} />);

    await userEvent.click(screen.getByRole('button', { name: /stop reply/i }));

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(baseProps.onSendMessage).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /send message/i })).not.toBeInTheDocument();
  });

  it('offers no stop button when no reply is streaming', () => {
    renderWithProviders(<ChatInput {...baseProps} onStop={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /stop reply/i })).not.toBeInTheDocument();
  });

  it('blocks sending while a reply is streaming', async () => {
    useMessageStore.setState({ message: 'hello' });
    renderWithProviders(<ChatInput {...baseProps} isLoading />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });
});
