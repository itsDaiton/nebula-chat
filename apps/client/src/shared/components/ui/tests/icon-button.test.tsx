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
});
