import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/shared/pages/NotFound';
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

describe('NotFound', () => {
  it('tells the user the page does not exist', () => {
    const { container } = renderWithChakra(<NotFound />);

    expect(container.textContent).toBeTruthy();
  });

  it('offers a way back', () => {
    renderWithChakra(<NotFound />);

    const interactive = [...screen.queryAllByRole('link'), ...screen.queryAllByRole('button')];
    expect(interactive.length).toBeGreaterThan(0);
  });
});
