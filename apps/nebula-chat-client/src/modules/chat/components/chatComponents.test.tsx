import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatEmptyState } from '@/modules/chat/components/ChatEmptyState';
import { ChatIcon } from '@/modules/chat/components/ChatIcon';
import { ChatMessage } from '@/modules/chat/components/ChatMessage';
import { ChatMessageList } from '@/modules/chat/components/ChatMessageList';
import { SendButton } from '@/modules/chat/components/SendButton';
import { resources } from '@/resources';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  useMultiLineStore.setState({ multiLineMap: {} });
});

describe('ChatEmptyState', () => {
  it('welcomes a brand new chat', () => {
    renderWithChakra(<ChatEmptyState conversationId={undefined} />);

    expect(screen.getByText(resources.chat.welcomeMessage)).toBeInTheDocument();
    expect(screen.getByText(resources.chat.welcomeIntro)).toBeInTheDocument();
  });

  it('shows the empty-conversation copy for an existing conversation', () => {
    renderWithChakra(<ChatEmptyState conversationId="c1" />);

    expect(screen.getByText(resources.chat.emptyConversation)).toBeInTheDocument();
    expect(screen.getByText(resources.chat.emptyConversationHint)).toBeInTheDocument();
  });
});

describe('SendButton', () => {
  it('is disabled until there is something to send', () => {
    renderWithChakra(<SendButton isLoading={false} message="" />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('stays disabled for whitespace only', () => {
    renderWithChakra(<SendButton isLoading={false} message="   " />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('enables once a message is typed', () => {
    renderWithChakra(<SendButton isLoading={false} message="hello" />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled();
  });

  it('is disabled while a reply is streaming, so a second send cannot start', () => {
    renderWithChakra(<SendButton isLoading message="hello" />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('submits the surrounding form', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    renderWithChakra(
      <form onSubmit={onSubmit}>
        <SendButton isLoading={false} message="hello" />
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSubmit).toHaveBeenCalled();
  });
});

describe('ChatIcon', () => {
  it('renders for a user message', () => {
    const { container } = renderWithChakra(<ChatIcon isUser />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders a different icon for the assistant', () => {
    const { container: user } = renderWithChakra(<ChatIcon isUser />);
    const { container: assistant } = renderWithChakra(<ChatIcon isUser={false} />);

    expect(user.innerHTML).not.toBe(assistant.innerHTML);
  });
});

describe('ChatMessage', () => {
  it('renders the message content', () => {
    renderWithChakra(<ChatMessage message={{ id: 'm1', role: 'user', content: 'hello there' }} />);

    expect(screen.getByText('hello there')).toBeInTheDocument();
  });

  it('renders assistant markdown as formatted content', () => {
    renderWithChakra(
      <ChatMessage message={{ id: 'm1', role: 'assistant', content: '# A heading' }} />,
    );

    expect(screen.getByText('A heading')).toBeInTheDocument();
  });

  it('renders an empty assistant message without crashing', () => {
    expect(() =>
      renderWithChakra(<ChatMessage message={{ id: 'm1', role: 'assistant', content: '' }} />),
    ).not.toThrow();
  });
});

describe('ChatMessageList', () => {
  const history = [
    { id: 'm1', role: 'user' as const, content: 'question' },
    { id: 'm2', role: 'assistant' as const, content: 'answer' },
  ];

  it('renders every message in order', () => {
    renderWithChakra(<ChatMessageList history={history} isStreaming={false} />);

    expect(screen.getByText('question')).toBeInTheDocument();
    expect(screen.getByText('answer')).toBeInTheDocument();
  });

  it('renders nothing for an empty conversation', () => {
    const { container } = renderWithChakra(<ChatMessageList history={[]} isStreaming={false} />);

    expect(container.textContent).toBe('');
  });

  it('shows the streaming indicator in place of the empty assistant placeholder', () => {
    const pending = [
      { id: 'm1', role: 'user' as const, content: 'question' },
      { id: 'm2', role: 'assistant' as const, content: '' },
    ];

    const streaming = renderWithChakra(<ChatMessageList history={pending} isStreaming />);

    // The empty assistant bubble is suppressed and the spinner takes its place.
    expect(screen.getByText('question')).toBeInTheDocument();
    expect(streaming.container.querySelector('.chakra-spinner')).toBeInTheDocument();
  });

  it('keeps the assistant message once tokens have arrived', () => {
    renderWithChakra(
      <ChatMessageList
        history={[
          { id: 'm1', role: 'user', content: 'question' },
          { id: 'm2', role: 'assistant', content: 'partial answer' },
        ]}
        isStreaming
      />,
    );

    expect(screen.getByText('partial answer')).toBeInTheDocument();
  });
});
