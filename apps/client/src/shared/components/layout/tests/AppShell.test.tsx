import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import {
  getGetSessionMockHandler,
  getListSessionsMockHandler,
} from '@/libs/api/generated/sessions/sessions.msw';
import { resources } from '@/resources';
import { PANEL_STORAGE_KEY, usePanelStore } from '@/shared/stores/usePanelStore';
import { useSearchStore } from '@/shared/stores/useSearchStore';
import { aSession, mockGetSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const aChatSession = { id: SESSION_ID, title: 'Earlier chat', createdAt: '2026-06-15T11:00:00Z' };

const toPx = (value: string, unit: string) => Number(value) * (unit === 'px' ? 1 : 16);

// Answers width queries for a viewport `width` px wide; every other query (colour scheme) is false.
// It re-implements the setup file's stub, so the stub itself (and the observers beside it) stay.
const mockViewport = (width: number) =>
  vi.mocked(window.matchMedia).mockImplementation((query: string) => {
    const min = /min-width:\s*([\d.]+)(px|em|rem)/.exec(query);
    const max = /max-width:\s*([\d.]+)(px|em|rem)/.exec(query);
    const matches =
      (min !== null || max !== null) &&
      (!min || width >= toPx(min[1]!, min[2]!)) &&
      (!max || width <= toPx(max[1]!, max[2]!));
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });

const sidebar = () => screen.queryByRole('complementary', { name: resources.shell.sidebar });
const inspector = () => screen.queryByRole('complementary', { name: resources.shell.inspector });
const button = (name: string) => screen.getByRole('button', { name });

// A reload: the in-memory store is lost and rebuilt from what was persisted.
const reload = async (unmount: () => void) => {
  unmount();
  const saved = localStorage.getItem(PANEL_STORAGE_KEY)!;
  // Resetting writes through to storage, so what was saved is put back before rehydrating.
  usePanelStore.setState({ isLeftPanelOpen: true, isRightPanelOpen: true });
  localStorage.setItem(PANEL_STORAGE_KEY, saved);
  await usePanelStore.persist.rehydrate();
  return renderRoute('/');
};

beforeEach(() => {
  localStorage.clear();
  usePanelStore.setState({
    isLeftPanelOpen: true,
    isRightPanelOpen: true,
    isDrawerOpen: false,
    isSheetOpen: false,
  });
  useSearchStore.setState({ isSearchOpen: false });
  server.use(
    mockGetSession(aSession()),
    getListSessionsMockHandler({ sessions: [aChatSession], nextCursor: null, hasMore: false }),
    getGetSessionMockHandler({ ...aChatSession, activeStreamId: null }),
    getListMessagesMockHandler([]),
    getGetMessageAllowanceMockHandler({ metered: false }),
  );
});

afterEach(() => {
  document.documentElement.className = '';
});

describe('AppShell on desktop', () => {
  beforeEach(() => mockViewport(1440));

  it('renders the header, then the sidebar, the page and the Inspector, in focus order', async () => {
    await renderRoute('/');

    const regions = [
      screen.getByRole('banner'),
      sidebar(),
      screen.getByRole('main'),
      inspector(),
    ] as HTMLElement[];
    expect(await within(sidebar()!).findByText('Earlier chat')).toBeInTheDocument();
    expect(within(regions[2]!).getByRole('textbox')).toBeInTheDocument();
    regions.slice(1).forEach((region, i) => {
      expect(regions[i]!.compareDocumentPosition(region)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  it('collapses the sidebar from the header and keeps it collapsed after a reload', async () => {
    const { unmount } = await renderRoute('/');

    await userEvent.click(button(resources.shell.toggleSidebar));

    expect(sidebar()).not.toBeInTheDocument();
    expect(button(resources.shell.toggleSidebar)).toHaveAttribute('aria-expanded', 'false');

    await reload(unmount);

    expect(sidebar()).not.toBeInTheDocument();
    expect(inspector()).toBeInTheDocument();
    await userEvent.click(button(resources.shell.toggleSidebar));
    expect(sidebar()).toBeInTheDocument();
  });

  it('collapses the Inspector from the header and keeps it collapsed after a reload', async () => {
    const { unmount } = await renderRoute('/');

    await userEvent.click(button(resources.shell.toggleInspector));

    expect(inspector()).not.toBeInTheDocument();

    await reload(unmount);

    expect(inspector()).not.toBeInTheDocument();
    expect(sidebar()).toBeInTheDocument();
  });

  it('toggles the panels with the keyboard shortcuts their tooltips show', async () => {
    await renderRoute('/');

    await userEvent.hover(button(resources.shell.toggleSidebar));
    const tooltip = (await screen.findByText(resources.shell.toggleSidebar)).parentElement!;
    expect(within(tooltip).getByText('Ctrl')).toBeInTheDocument();
    expect(within(tooltip).getByText('B')).toBeInTheDocument();

    await userEvent.keyboard('{Control>}b{/Control}');
    expect(sidebar()).not.toBeInTheDocument();

    await userEvent.keyboard('{Control>}{Shift>}b{/Shift}{/Control}');
    expect(inspector()).not.toBeInTheDocument();

    await userEvent.keyboard('{Control>}b{/Control}');
    expect(sidebar()).toBeInTheDocument();
  });

  it('opens the chat search from the command hint', async () => {
    await renderRoute('/');

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: resources.shell.commandHint }),
    );

    expect(await screen.findByPlaceholderText(resources.sessions.searchPlaceholder)).toBeVisible();
  });

  it('opens the chat search from the command hint even with the sidebar collapsed', async () => {
    await renderRoute('/');
    await userEvent.click(button(resources.shell.toggleSidebar));

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: resources.shell.commandHint }),
    );

    expect(await screen.findByPlaceholderText(resources.sessions.searchPlaceholder)).toBeVisible();
  });

  it('switches between light and dark from the theme toggle, starting from the system', async () => {
    await renderRoute('/');

    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    await userEvent.click(button(resources.shell.toggleTheme));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    await userEvent.click(button(resources.shell.toggleTheme));
    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
  });
});

describe('AppShell below the large breakpoint', () => {
  beforeEach(() => mockViewport(390));

  it('shows only the page, with the side panels behind header buttons', async () => {
    await renderRoute('/');

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(sidebar()).not.toBeInTheDocument();
    expect(inspector()).not.toBeInTheDocument();
  });

  it('opens the sidebar as a drawer from the menu button and closes it with Escape', async () => {
    await renderRoute('/');

    await userEvent.click(button(resources.shell.openSidebar));

    const drawer = await screen.findByRole('dialog', { name: resources.shell.sidebar });
    expect(await within(drawer).findByText('Earlier chat')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the drawer when a Session in it is opened', async () => {
    const { router } = await renderRoute('/');

    await userEvent.click(button(resources.shell.openSidebar));
    const drawer = await screen.findByRole('dialog', { name: resources.shell.sidebar });
    await userEvent.click(await within(drawer).findByText('Earlier chat'));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/s/${SESSION_ID}`));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the drawer on any navigation', async () => {
    const { router } = await renderRoute('/');

    await userEvent.click(button(resources.shell.openSidebar));
    await screen.findByRole('dialog', { name: resources.shell.sidebar });

    await router.navigate({ to: '/s/$id', params: { id: SESSION_ID } });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the Inspector as a bottom sheet and closes it with Escape', async () => {
    await renderRoute('/');

    await userEvent.click(button(resources.shell.openInspector));

    expect(
      await screen.findByRole('dialog', { name: resources.shell.inspector }),
    ).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the sheet on any navigation', async () => {
    const { router } = await renderRoute('/');

    await userEvent.click(button(resources.shell.openInspector));
    await screen.findByRole('dialog', { name: resources.shell.inspector });

    await router.navigate({ to: '/s/$id', params: { id: SESSION_ID } });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the drawer and the sheet with the panel shortcuts', async () => {
    await renderRoute('/');

    await userEvent.keyboard('{Control>}b{/Control}');
    expect(
      await screen.findByRole('dialog', { name: resources.shell.sidebar }),
    ).toBeInTheDocument();

    await userEvent.keyboard('{Control>}{Shift>}b{/Shift}{/Control}');
    expect(
      await screen.findByRole('dialog', { name: resources.shell.inspector }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: resources.shell.sidebar })).not.toBeInTheDocument();
  });
});
