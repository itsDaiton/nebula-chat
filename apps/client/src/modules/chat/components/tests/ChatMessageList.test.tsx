import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatMessageList } from '@/modules/chat/components/ChatMessageList';
import { renderWithProviders } from '@/test/render';

describe('ChatMessageList', () => {
  const history = [
    { id: 'm1', role: 'user' as const, content: 'question' },
    { id: 'm2', role: 'assistant' as const, content: 'answer' },
  ];

  it('renders every message in order', () => {
    renderWithProviders(<ChatMessageList history={history} isStreaming={false} />);

    expect(screen.getByText('question')).toBeInTheDocument();
    expect(screen.getByText('answer')).toBeInTheDocument();
  });

  it('renders nothing for an empty session', () => {
    renderWithProviders(<ChatMessageList history={[]} isStreaming={false} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="message-meta-row"]')).not.toBeInTheDocument();
  });

  it('shows the streaming indicator in place of the empty assistant placeholder', () => {
    const pending = [
      { id: 'm1', role: 'user' as const, content: 'question' },
      { id: 'm2', role: 'assistant' as const, content: '' },
    ];

    renderWithProviders(<ChatMessageList history={pending} isStreaming />);

    // The empty assistant bubble is suppressed and the spinner takes its place.
    expect(screen.getByText('question')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('offers no copy on a reply still arriving', () => {
    renderWithProviders(
      <ChatMessageList
        history={[
          { id: 'm1', role: 'user', content: 'question' },
          { id: 'm2', role: 'assistant', content: 'partial' },
        ]}
        isStreaming
      />,
    );

    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });

  it('keeps the assistant message once tokens have arrived', () => {
    renderWithProviders(
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

describe('ChatMessageList stopped reply', () => {
  const stopped = [{ id: 'm1', role: 'user' as const, content: 'tell me a story' }];

  it('says the reply was stopped and retries the last prompt', async () => {
    const onRegenerate = vi.fn();
    renderWithProviders(
      <ChatMessageList
        history={stopped}
        isStreaming={false}
        isReplyStopped
        onRegenerate={onRegenerate}
      />,
    );

    expect(screen.getByText('Reply stopped')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRegenerate).toHaveBeenCalledWith('tell me a story');
  });

  it('shows nothing when the reply was not stopped', () => {
    renderWithProviders(<ChatMessageList history={stopped} isStreaming={false} />);

    expect(screen.queryByText('Reply stopped')).not.toBeInTheDocument();
  });

  it('shows nothing while a reply streams', () => {
    renderWithProviders(<ChatMessageList history={stopped} isStreaming isReplyStopped />);

    expect(screen.queryByText('Reply stopped')).not.toBeInTheDocument();
  });
});

describe('ChatMessageList regenerate', () => {
  const thread = [
    { id: 'm1', role: 'user' as const, content: 'first question' },
    { id: 'm2', role: 'assistant' as const, content: 'first answer' },
    { id: 'm3', role: 'user' as const, content: 'second question' },
    { id: 'm4', role: 'assistant' as const, content: 'second answer' },
  ];

  it('offers regenerate on the newest reply only, re-asking its prompt', async () => {
    const onRegenerate = vi.fn();
    renderWithProviders(
      <ChatMessageList history={thread} isStreaming={false} onRegenerate={onRegenerate} />,
    );

    const buttons = screen.getAllByRole('button', { name: 'Regenerate' });
    expect(buttons).toHaveLength(1);
    await userEvent.click(buttons[0]);

    expect(onRegenerate).toHaveBeenCalledWith('second question');
  });

  it('offers none while a reply streams', () => {
    renderWithProviders(<ChatMessageList history={thread} isStreaming onRegenerate={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Regenerate' })).not.toBeInTheDocument();
  });
});
