import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@/resources';
import { holdSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { renderRoute } from '@/test/renderRoute';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

// The menu button is mobile-only, and jsdom's stubbed matchMedia always reports
// the desktop breakpoint, so the layout is forced here instead.
const layout = vi.hoisted(() => ({ isMobile: true, showSidePanels: false, showRightPanel: false }));
vi.mock('@/shared/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => layout }));

const UNKNOWN_URL = '/no-such-page';

beforeEach(async () => {
  vi.clearAllMocks();
  serveChatPage();
  await holdSession({});
});

describe('NotFound', () => {
  it('tells the user the page does not exist', async () => {
    await renderRoute(UNKNOWN_URL);

    expect(screen.getByText(resources.notFound.title)).toBeInTheDocument();
  });

  it('offers a way back to the chat', async () => {
    const { router } = await renderRoute(UNKNOWN_URL);

    await userEvent.click(screen.getByRole('button', { name: resources.notFound.action }));

    expect(
      await screen.findByRole('textbox', { name: resources.chat.composer.label }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
