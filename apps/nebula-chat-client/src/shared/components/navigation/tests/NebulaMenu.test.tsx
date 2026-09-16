import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaMenu } from '@/shared/components/navigation/NebulaMenu';
import { renderWithChakra } from '@/test/render';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

// The menu button is mobile-only, and jsdom's stubbed matchMedia always reports
// the desktop breakpoint, so the layout is forced here instead.
const layout = vi.hoisted(() => ({ isMobile: true, showSidePanels: false, showRightPanel: false }));
vi.mock('@/shared/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => layout }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NebulaMenu', () => {
  it('renders a trigger for the supplied items', () => {
    renderWithChakra(
      <NebulaMenu items={[{ id: 1, value: 'profile', label: 'Profile', onClick: vi.fn() }]} />,
    );

    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders with no items', () => {
    expect(() => renderWithChakra(<NebulaMenu items={[]} />)).not.toThrow();
  });
});
