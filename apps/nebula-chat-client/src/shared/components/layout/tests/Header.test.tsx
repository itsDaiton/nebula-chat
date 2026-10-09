import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '@/shared/components/layout/Header';
import { resources } from '@/resources';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
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
  server.use(mockGetSession(aSession()));
});

describe('Header', () => {
  it('renders the app name', () => {
    renderWithChakra(<Header />);

    expect(screen.getByText(/nebula chat/i)).toBeInTheDocument();
  });

  // KNOWN A11Y GAP, pinned rather than endorsed: the menu control is a clickable
  // <Icon> (an svg with aria-label), not a button. It therefore has no button
  // role, is not in the tab order, and cannot be activated by keyboard — so this
  // queries by label rather than by role.
  it('invokes the menu handler when the menu control is clicked', async () => {
    const onMenuClick = vi.fn();
    renderWithChakra(<Header onMenuClick={onMenuClick} />);

    await userEvent.click(screen.getByLabelText('Menu'));

    expect(onMenuClick).toHaveBeenCalled();
  });

  it('hides the menu control on a desktop layout', () => {
    layout.isMobile = false;

    renderWithChakra(<Header onMenuClick={vi.fn()} />);

    expect(screen.queryByLabelText('Menu')).not.toBeInTheDocument();
    layout.isMobile = true;
  });

  it('shows the account menu and the theme toggle, without the old gear menu', async () => {
    renderWithChakra(<Header />);
    refreshSession();

    expect(
      await screen.findByRole('button', { name: resources.userMenu.label }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /toggle color mode/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('renders without a menu handler', () => {
    expect(() => renderWithChakra(<Header />)).not.toThrow();
  });
});
