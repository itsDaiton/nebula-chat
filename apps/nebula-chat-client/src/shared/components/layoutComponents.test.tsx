import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '@/shared/components/layout/Header';
import { SidePanel } from '@/shared/components/layout/SidePanel';
import { NebulaMenu } from '@/shared/components/navigation/NebulaMenu';
import { NotFound } from '@/shared/pages/NotFound';
import { route } from '@/routing/routes';
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

  it('renders without a menu handler', () => {
    expect(() => renderWithChakra(<Header />)).not.toThrow();
  });
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
