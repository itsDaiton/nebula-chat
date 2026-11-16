import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Kbd, KbdGroup } from '@/shared/components/ui/kbd';
import { renderWithProviders } from '@/test/render';

describe('Kbd', () => {
  it('shows each key of a shortcut', () => {
    renderWithProviders(
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );

    expect(screen.getByText('Ctrl')).toBeVisible();
    expect(screen.getByText('K')).toBeVisible();
  });
});
