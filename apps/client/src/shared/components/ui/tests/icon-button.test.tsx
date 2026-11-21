import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { IconButton } from '@/shared/components/ui/icon-button';
import { renderWithProviders } from '@/test/render';

describe('IconButton', () => {
  it('names the button and shows that name as a tooltip on hover', async () => {
    renderWithProviders(<IconButton label="Copy">i</IconButton>);

    await userEvent.hover(screen.getByRole('button', { name: 'Copy' }));

    expect(
      await screen.findByText('Copy', { selector: '[data-slot="tooltip-content"]' }),
    ).toBeVisible();
  });

  it('swaps the icon for a spinner while loading and keeps its accessible name', () => {
    renderWithProviders(
      <IconButton label="Copy" loading>
        <svg data-testid="icon" />
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: 'Copy' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(button.firstElementChild).toHaveAttribute('data-slot', 'spinner');
    expect(button.className).toContain('[&>[data-slot=spinner]+svg]:hidden');
  });
});
