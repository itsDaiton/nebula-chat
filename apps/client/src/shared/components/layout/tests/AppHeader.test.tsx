import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from '@/shared/components/layout/AppHeader';
import { resources } from '@/resources';
import { aSession, mockGetSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderInRouter } from '@/test/renderRoute';

const toggleColorMode = vi.hoisted(() => vi.fn());
vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'dark', toggleColorMode }),
}));

const renderHeader = () =>
  renderInRouter(
    <AppHeader
      isDesktop
      leftOpen
      rightOpen
      onToggleLeft={vi.fn()}
      onToggleRight={vi.fn()}
      onOpenSearch={vi.fn()}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  server.use(mockGetSession(aSession()));
});

describe('AppHeader colour mode', () => {
  it('shows the shortcut in the toggle tooltip', async () => {
    await renderHeader();

    await userEvent.hover(screen.getByRole('button', { name: resources.shell.toggleColorMode }));

    const tooltip = await screen.findByText(resources.shell.toggleColorMode, {
      selector: '[data-slot="tooltip-content"]',
    });
    expect(tooltip).toHaveTextContent('L');
    expect(tooltip.querySelector('[data-slot="kbd"]')).toBeInTheDocument();
  });

  it('toggles on Ctrl+Shift+L', async () => {
    await renderHeader();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'L', ctrlKey: true, shiftKey: true, bubbles: true }),
      );
    });

    expect(toggleColorMode).toHaveBeenCalledTimes(1);
  });
});
