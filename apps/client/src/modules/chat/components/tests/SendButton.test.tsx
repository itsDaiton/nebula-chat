import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SendButton } from '@/modules/chat/components/SendButton';
import { renderWithProviders } from '@/test/render';

describe('SendButton', () => {
  it('is disabled until there is something to send', () => {
    renderWithProviders(<SendButton isLoading={false} message="" />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('stays disabled for whitespace only', () => {
    renderWithProviders(<SendButton isLoading={false} message="   " />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('enables once a message is typed', () => {
    renderWithProviders(<SendButton isLoading={false} message="hello" />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled();
  });

  it('is disabled while a reply is streaming, so a second send cannot start', () => {
    renderWithProviders(<SendButton isLoading message="hello" />);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('submits the surrounding form', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    renderWithProviders(
      <form onSubmit={onSubmit}>
        <SendButton isLoading={false} message="hello" />
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSubmit).toHaveBeenCalled();
  });
});
