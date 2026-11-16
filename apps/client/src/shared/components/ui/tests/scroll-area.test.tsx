import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { renderWithProviders } from '@/test/render';

describe('ScrollArea', () => {
  it('shows its content', () => {
    renderWithProviders(
      <ScrollArea>
        <p>First session</p>
      </ScrollArea>,
    );

    expect(screen.getByText('First session')).toBeVisible();
  });
});
