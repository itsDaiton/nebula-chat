import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatMessage } from '@/modules/chat/components/ChatMessage';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  useMultiLineStore.setState({ multiLineMap: {} });
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
