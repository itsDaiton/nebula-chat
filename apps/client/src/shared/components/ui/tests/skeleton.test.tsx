import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { renderWithProviders } from '@/test/render';

describe('Skeleton', () => {
  it('takes the role and name its caller gives the placeholder', () => {
    renderWithProviders(<Skeleton role="status" aria-label="Loading sessions" className="h-4" />);

    expect(screen.getByRole('status', { name: 'Loading sessions' })).toBeInTheDocument();
  });
});
