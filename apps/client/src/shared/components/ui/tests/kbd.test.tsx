import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Kbd, KbdGroup } from '@/shared/components/ui/kbd';
import { renderWithProviders } from '@/test/render';

describe('Kbd', () => {
  it('marks up a shortcut as keyboard input', () => {
    renderWithProviders(
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );

    expect(screen.getByText('Ctrl').tagName).toBe('KBD');
    expect(screen.getByText('K').parentElement?.tagName).toBe('KBD');
  });
});
