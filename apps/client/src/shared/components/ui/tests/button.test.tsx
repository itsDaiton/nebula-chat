import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MailIcon } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/shared/components/ui/button';

describe('Button', () => {
  it('renders normally when not loading', () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button.querySelector('[data-slot="spinner"]')).toBeNull();
  });

  it('shows a spinner, is disabled and busy, and ignores clicks while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('[data-slot="spinner"]')).not.toBeNull();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps a caller disabled when not loading', () => {
    render(<Button disabled>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('puts the spinner before a leading icon, which the spinner replaces', () => {
    render(
      <Button loading>
        <MailIcon data-testid="icon" />
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.firstElementChild).toHaveAttribute('data-slot', 'spinner');
    expect(button.firstElementChild?.nextElementSibling).toBe(screen.getByTestId('icon'));
    expect(button.className).toContain('[&>[data-slot=spinner]+svg]:hidden');
  });
});
