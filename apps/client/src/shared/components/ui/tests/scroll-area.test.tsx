import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { renderWithProviders } from '@/test/render';

describe('ScrollArea', () => {
  it('renders its content inside the scroll viewport', () => {
    renderWithProviders(
      <ScrollArea>
        <p>First session</p>
      </ScrollArea>,
    );

    expect(
      screen.getByText('First session').closest('[data-slot=scroll-area-viewport]'),
    ).not.toBeNull();
  });
});
