import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/shared/components/ui/badge';
import { renderWithProviders } from '@/test/render';

describe('Badge', () => {
  it('shows its label', () => {
    renderWithProviders(<Badge variant="secondary">Guest</Badge>);

    expect(screen.getByText('Guest')).toBeVisible();
  });

  it('renders as the element it is given', () => {
    renderWithProviders(<Badge render={<a href="/settings" />}>Admin</Badge>);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/settings');
  });
});
