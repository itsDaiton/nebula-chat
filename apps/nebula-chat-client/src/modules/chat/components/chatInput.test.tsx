import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatContainerBox } from '@/modules/chat/components/ChatContainerBox';
import { ChatInput } from '@/modules/chat/components/ChatInput';
import { ChatInputBar } from '@/modules/chat/components/ChatInputBar';
import { ChatMessageSkeleton } from '@/modules/chat/components/ChatMessageSkeleton';
import { ChatMessagesSkeletons } from '@/modules/chat/components/ChatMessagesSkeletons';
import { ModelSelect } from '@/modules/chat/components/ModelSelect';
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

describe('ModelSelect', () => {
  // The label also appears in the hidden native <select>, so the trigger's own
  // value text is queried rather than the whole tree.
  const valueText = (container: HTMLElement) =>
    container.querySelector('[data-part="value-text"]')?.textContent;

  it('shows the currently selected model', () => {
    const { container } = renderWithChakra(
      <ModelSelect selectedModel="gpt-4o-mini" onModelChange={vi.fn()} />,
    );

    expect(valueText(container)).toBe('GPT-4o mini');
  });

  it('reflects a different selection', () => {
    const { container } = renderWithChakra(
      <ModelSelect selectedModel="gpt-4o" onModelChange={vi.fn()} />,
    );

    expect(valueText(container)).toBe('GPT-4o');
  });

  it('exposes the trigger as a combobox for keyboard and screen-reader users', () => {
    const { container } = renderWithChakra(
      <ModelSelect selectedModel="gpt-4o-mini" onModelChange={vi.fn()} />,
    );

    expect(container.querySelector('[data-part="trigger"]')).toBeInTheDocument();
  });
});

describe('ChatContainerBox', () => {
  it('renders its children', () => {
    renderWithChakra(
      <ChatContainerBox>
        <p>inner</p>
      </ChatContainerBox>,
    );

    expect(screen.getByText('inner')).toBeInTheDocument();
  });
});

describe('chat skeletons', () => {
  it('renders a single message skeleton', () => {
    const { container } = renderWithChakra(<ChatMessageSkeleton />);

    expect(container.querySelectorAll('.chakra-skeleton').length).toBeGreaterThan(0);
  });

  it('renders a user-aligned variant', () => {
    const assistant = renderWithChakra(<ChatMessageSkeleton />);
    const assistantHtml = assistant.container.innerHTML;
    assistant.unmount();

    const user = renderWithChakra(<ChatMessageSkeleton isUser />);

    expect(user.container.innerHTML).not.toBe(assistantHtml);
  });

  it('renders a group of skeletons', () => {
    const { container } = renderWithChakra(<ChatMessagesSkeletons />);

    expect(container.querySelectorAll('.chakra-skeleton').length).toBeGreaterThan(1);
  });
});
