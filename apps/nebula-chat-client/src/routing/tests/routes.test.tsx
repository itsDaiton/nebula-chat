import { beforeEach, describe, expect, it, vi } from 'vitest';
import { route } from '@/routing/routes';

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

describe('routes', () => {
  it('builds the chat root', () => {
    expect(route.chat.root()).toBe('/');
  });

  it('builds a conversation path from its id', () => {
    expect(route.chat.conversation('abc')).toBe('/c/abc');
  });

  it('builds the auth path', () => {
    expect(route.auth()).toBe('/auth');
  });
});
