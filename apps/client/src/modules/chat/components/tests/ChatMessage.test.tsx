import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ChatMessage } from '@/modules/chat/components/ChatMessage';
import { renderWithProviders } from '@/test/render';

describe('ChatMessage', () => {
  it('renders a User message as its text', () => {
    renderWithProviders(
      <ChatMessage message={{ id: 'm1', role: 'user', content: 'hello there' }} />,
    );

    expect(screen.getByText('hello there')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });

  it('renders assistant markdown as formatted content', () => {
    renderWithProviders(
      <ChatMessage message={{ id: 'm1', role: 'assistant', content: '# A heading' }} />,
    );

    expect(screen.getByRole('heading', { name: 'A heading' })).toBeInTheDocument();
  });

  it('renders a GFM table in an assistant answer', () => {
    renderWithProviders(
      <ChatMessage
        message={{ id: 'm1', role: 'assistant', content: '| a | b |\n| - | - |\n| 1 | 2 |' }}
      />,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('labels a code block with its language and copies just the code', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ChatMessage
        message={{ id: 'm1', role: 'assistant', content: '```typescript\nconst x = 1;\n```' }}
      />,
    );

    expect(screen.getByText('typescript')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Copy' })[0]);

    expect(await navigator.clipboard.readText()).toBe('const x = 1;');
  });

  it('highlights a code block through the css-variables theme', async () => {
    const { container } = renderWithProviders(
      <ChatMessage
        message={{ id: 'm1', role: 'assistant', content: '```typescript\nconst x = 1;\n```' }}
      />,
    );

    await screen.findByText('const', { selector: 'span' });
    expect(container.querySelector('pre')?.innerHTML).toContain('var(--shiki-');
  });

  it('renders an empty assistant message without crashing', () => {
    expect(() =>
      renderWithProviders(<ChatMessage message={{ id: 'm1', role: 'assistant', content: '' }} />),
    ).not.toThrow();
  });
});
