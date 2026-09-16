import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidePanel } from '@/shared/components/layout/SidePanel';
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

describe('SidePanel', () => {
  it('renders its children', () => {
    renderWithChakra(
      <SidePanel>
        <p>panel body</p>
      </SidePanel>,
    );

    expect(screen.getByText('panel body')).toBeInTheDocument();
  });
});
