import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGetSessionMockHandler,
  getListSessionsMockHandler,
} from '@/libs/api/generated/sessions/sessions.msw';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { resources } from '@/resources';
import { useDrawerStore } from '@/shared/stores/useDrawerStore';
import { PANEL_STORAGE_KEY, usePanelStore } from '@/shared/stores/usePanelStore';
import { aSession, mockGetSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const layout = vi.hoisted(() => ({ isMobile: false, showSidePanels: true, showRightPanel: true }));
vi.mock('@/shared/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => layout }));

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const session = {
  id: SESSION_ID,
  title: 'Run events in the SSE parser',
  createdAt: '2026-06-15T11:00:00.000Z',
};

const setDesktop = (isDesktop: boolean) => {
  layout.isMobile = !isDesktop;
  layout.showSidePanels = isDesktop;
};

const sessionsPanel = () => screen.queryByText(resources.sessions.empty);
const toggleLeft = () => screen.getByRole('button', { name: resources.shell.togglePanel.left });

beforeEach(() => {
  localStorage.clear();
  setDesktop(true);
  usePanelStore.setState({ leftOpen: true, rightOpen: true, sheetOpen: false });
  useDrawerStore.setState({ isDrawerOpen: false });
  server.use(
    mockGetSession(aSession()),
    getListSessionsMockHandler({ sessions: [], nextCursor: null, hasMore: false }),
    getGetSessionMockHandler({ ...session, activeStreamId: null }),
    getListMessagesMockHandler([]),
    getGetMessageAllowanceMockHandler({ metered: false }),
  );
});

describe('AppShell on desktop', () => {
  it('frames the page with the header, both panels and the open Session title', async () => {
    await renderRoute(`/s/${SESSION_ID}`);

    expect(await screen.findByRole('heading', { name: session.title })).toBeInTheDocument();
    expect(screen.getByText(resources.chat.appName)).toBeInTheDocument();
    expect(await screen.findByText(resources.sessions.empty)).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: resources.shell.inspector }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('collapses and expands the left panel from the header', async () => {
    await renderRoute('/');
    await screen.findByText(resources.sessions.empty);

    await userEvent.click(toggleLeft());
    expect(sessionsPanel()).not.toBeInTheDocument();

    await userEvent.click(toggleLeft());
    expect(await screen.findByText(resources.sessions.empty)).toBeInTheDocument();
  });

  it('collapses the Inspector from the header and with its shortcut', async () => {
    await renderRoute('/');
    const inspector = () =>
      screen.queryByRole('complementary', { name: resources.shell.inspector });

    await userEvent.click(screen.getByRole('button', { name: resources.shell.togglePanel.right }));
    expect(inspector()).not.toBeInTheDocument();

    await userEvent.keyboard('{Control>}i{/Control}');
    expect(inspector()).toBeInTheDocument();
  });

  it('keeps a collapsed panel collapsed after a reload', async () => {
    const first = await renderRoute('/');
    await userEvent.click(toggleLeft());
    first.unmount();

    // A reload forgets memory but not localStorage.
    const saved = localStorage.getItem(PANEL_STORAGE_KEY) ?? '';
    usePanelStore.setState({ leftOpen: true });
    localStorage.setItem(PANEL_STORAGE_KEY, saved);
    await usePanelStore.persist.rehydrate();
    await renderRoute('/');

    await waitFor(() => expect(toggleLeft()).toHaveAttribute('aria-pressed', 'false'));
    expect(sessionsPanel()).not.toBeInTheDocument();
  });
});

describe('AppShell on a small screen', () => {
  beforeEach(() => setDesktop(false));

  it('opens the left panel as a drawer from the menu button and closes it with Escape', async () => {
    await renderRoute('/');

    await userEvent.click(screen.getByRole('button', { name: resources.shell.menu }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText(resources.sessions.empty)).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the Inspector as a bottom sheet and closes it with Escape', async () => {
    await renderRoute('/');

    await userEvent.click(screen.getByRole('button', { name: resources.shell.togglePanel.right }));
    const sheet = await screen.findByRole('dialog', { name: resources.shell.inspector });
    expect(sheet).toHaveAttribute('data-side', 'bottom');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the Inspector sheet on navigation', async () => {
    const { router } = await renderRoute('/');
    await userEvent.click(screen.getByRole('button', { name: resources.shell.togglePanel.right }));
    await screen.findByRole('dialog');

    await router.navigate({ to: '/s/$id', params: { id: SESSION_ID } });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the drawer on navigation', async () => {
    const { router } = await renderRoute('/');
    await userEvent.click(screen.getByRole('button', { name: resources.shell.menu }));
    await screen.findByRole('dialog');

    await router.navigate({ to: '/s/$id', params: { id: SESSION_ID } });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
