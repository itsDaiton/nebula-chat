import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PasswordInput } from '@/shared/components/ui/password-input';
import { resources } from '@/resources';
import { renderWithChakra } from '@/test/render';

describe('PasswordInput', () => {
  it('masks the value and offers to show it', async () => {
    const onToggleVisibility = vi.fn();
    renderWithChakra(
      <PasswordInput
        aria-label="Password"
        visible={false}
        onToggleVisibility={onToggleVisibility}
      />,
    );

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');

    await userEvent.click(
      screen.getByRole('button', { name: resources.passwordInput.showPassword }),
    );

    expect(onToggleVisibility).toHaveBeenCalledOnce();
  });

  it('reveals the value and offers to hide it', () => {
    renderWithChakra(<PasswordInput aria-label="Password" visible onToggleVisibility={vi.fn()} />);

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: resources.passwordInput.hidePassword }),
    ).toBeInTheDocument();
  });

  it('toggles without submitting the surrounding form', async () => {
    const onSubmit = vi.fn();
    renderWithChakra(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <PasswordInput aria-label="Password" visible={false} onToggleVisibility={vi.fn()} />
      </form>,
    );

    await userEvent.click(
      screen.getByRole('button', { name: resources.passwordInput.showPassword }),
    );

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
