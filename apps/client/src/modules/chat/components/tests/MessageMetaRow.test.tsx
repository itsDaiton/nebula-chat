import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageMetaRow } from '@/modules/chat/components/MessageMetaRow';
import type { ChatMessage } from '@/modules/chat/types/types';
import { renderWithProviders } from '@/test/render';

const reply = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm1',
  role: 'assistant',
  content: 'the answer',
  ...overrides,
});

describe('MessageMetaRow', () => {
  it('is reachable by keyboard, so focus brings it into view', async () => {
    renderWithProviders(<MessageMetaRow message={reply()} onRegenerate={vi.fn()} />);

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'Copy' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Regenerate' })).toHaveFocus();
  });

  it('copies the answer to the clipboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MessageMetaRow message={reply({ content: 'copy me' })} />);

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(await navigator.clipboard.readText()).toBe('copy me');
  });

  it('regenerates on request', async () => {
    const onRegenerate = vi.fn();
    renderWithProviders(<MessageMetaRow message={reply()} onRegenerate={onRegenerate} />);

    await userEvent.click(screen.getByRole('button', { name: 'Regenerate' }));

    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('offers no regenerate for a reply that is not the newest', () => {
    renderWithProviders(<MessageMetaRow message={reply()} />);

    expect(screen.queryByRole('button', { name: 'Regenerate' })).not.toBeInTheDocument();
  });

  it('shows the Model, the token count and the estimated cost when the Message carries them', () => {
    renderWithProviders(
      <MessageMetaRow
        message={reply({ model: 'gpt-4.1-mini', tokenCount: 1284, estimatedCostUsd: 0.0021 })}
      />,
    );

    expect(screen.getByText('GPT-4.1 mini')).toBeInTheDocument();
    expect(screen.getByText('1,284 tokens')).toBeInTheDocument();
    expect(screen.getByText('~$0.0021')).toBeInTheDocument();
  });

  it('renders nothing for what the API has not provided yet', () => {
    renderWithProviders(<MessageMetaRow message={reply({ tokenCount: null })} />);

    expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it('reads "Run" with the Run totals for a Run answer', () => {
    renderWithProviders(
      <MessageMetaRow
        message={reply({ runId: 'r1', model: null, tokenCount: 9000, estimatedCostUsd: 0.31 })}
      />,
    );

    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByText('9,000 tokens')).toBeInTheDocument();
    expect(screen.getByText('~$0.31')).toBeInTheDocument();
    expect(screen.queryByText(/tok\b/)).not.toBeInTheDocument();
  });
});
