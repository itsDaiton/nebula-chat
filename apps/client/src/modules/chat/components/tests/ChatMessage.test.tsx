import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatMessage } from '@/modules/chat/components/ChatMessage';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { resources } from '@/resources';
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

  it('labels a Clarifying question, and while the Run waits notes the wait and the Steps done', () => {
    renderWithChakra(
      <ChatMessage
        message={{ id: 'm1', role: 'assistant', content: 'Which plans?', clarifying: true }}
        waitingRun={{ runId: 'r1', streamId: 's1', stepsCompleted: 3 }}
      />,
    );

    expect(screen.getByText(resources.chat.clarifying.label)).toBeInTheDocument();
    expect(screen.getByText(resources.chat.clarifying.note)).toBeInTheDocument();
    expect(screen.getByText(resources.chat.clarifying.progress(3))).toBeInTheDocument();
  });

  it('keeps the label but drops the waiting note once the Run no longer waits', () => {
    renderWithChakra(
      <ChatMessage
        message={{ id: 'm1', role: 'assistant', content: 'Which plans?', clarifying: true }}
      />,
    );

    expect(screen.getByText(resources.chat.clarifying.label)).toBeInTheDocument();
    expect(screen.queryByText(resources.chat.clarifying.note)).not.toBeInTheDocument();
  });
});
