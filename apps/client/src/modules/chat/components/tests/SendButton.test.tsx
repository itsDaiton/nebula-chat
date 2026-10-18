import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SendButton } from '@/modules/chat/components/SendButton';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  useMultiLineStore.setState({ multiLineMap: {} });
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
