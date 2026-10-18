import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatMessageList } from '@/modules/chat/components/ChatMessageList';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  useMultiLineStore.setState({ multiLineMap: {} });
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
