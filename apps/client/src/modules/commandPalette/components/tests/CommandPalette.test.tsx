import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import {
  getGetSessionMockHandler,
  getListSessionsMockHandler,
} from '@/libs/api/generated/sessions/sessions.msw';
import { useModelPickerStore } from '@/modules/chat/stores/useModelPickerStore';
import { useCommandPaletteStore } from '@/modules/commandPalette/stores/useCommandPaletteStore';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { useSearchStore } from '@/shared/stores/useSearchStore';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const FIRST = '11111111-1111-4111-8111-111111111111';
const SECOND = '22222222-2222-4222-8222-222222222222';

const aListedSession = (id: string, title: string) => ({
  id,
  title,
  createdAt: new Date().toISOString(),
  archived: false,
});

const recent = [aListedSession(FIRST, 'Run events in the SSE parser')];
const found = [aListedSession(SECOND, 'Zone 2 plan for October')];

const renderApp = async (user = aSession({ isAnonymous: false })) => {
  server.use(
    mockGetSession(user),
    getListSessionsMockHandler({ sessions: recent, nextCursor: null, hasMore: false }),
    getGetSessionMockHandler({ ...recent[0], activeStreamId: null }),
    getListMessagesMockHandler([]),
    getGetMessageAllowanceMockHandler({ metered: false }),
  );
  const view = await renderRoute('/', { seedSession: false });
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: resources.auth.loading })).not.toBeInTheDocument(),
  );
  refreshSession();
  return view;
};

const openPalette = async () => {
  await userEvent.keyboard('{Control>}k{/Control}');
  return screen.findByPlaceholderText(resources.commandPalette.placeholder);
};

beforeEach(() => {
  localStorage.clear();
  usePanelStore.setState({ leftOpen: false, rightOpen: false, sheetOpen: false });
  useSearchStore.setState({ isSearchOpen: false });
  useCommandPaletteStore.getState().clearQuery();
  useModelPickerStore.setState({ isOpen: false, search: '' });
});

describe('the command palette', () => {
  it('opens on Ctrl+K, lists recent Sessions and actions, and closes on Escape', async () => {
    await renderApp();

    await openPalette();

    expect(
      await screen.findByRole('option', { name: /Run events in the SSE parser/ }),
    ).toBeVisible();
    expect(screen.getByRole('option', { name: /New chat/ })).toBeVisible();
    expect(
      screen.getByRole('option', { name: new RegExp(resources.commandPalette.toggleTheme) }),
    ).toBeVisible();

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText(resources.commandPalette.placeholder),
      ).not.toBeInTheDocument(),
    );
  });

  it('opens from the header button', async () => {
    await renderApp();

    await userEvent.click(await screen.findByRole('button', { name: resources.shell.search }));

    expect(await screen.findByPlaceholderText(resources.commandPalette.placeholder)).toBeVisible();
  });

  it('hints the keys of each action and closes with esc', async () => {
    await renderApp();
    await openPalette();

    const withKeys = (name: string) =>
      screen.getByRole('option', { name: new RegExp(name) }).querySelectorAll('[data-slot="kbd"]');
    expect([...withKeys('New chat')].map((key) => key.textContent)).toEqual(['Ctrl', 'E']);
    expect([...withKeys('Toggle theme')].map((key) => key.textContent)).toEqual(['Ctrl', '⇧', 'Y']);
    expect([...withKeys('Switch Model')].map((key) => key.textContent)).toEqual(['Ctrl', '⇧', 'L']);
    expect([...withKeys('Open Settings')].map((key) => key.textContent)).toEqual(['Ctrl', ',']);
    expect(screen.getAllByText('esc').length).toBeGreaterThanOrEqual(2);
  });

  it('highlights the typed text in Session titles and action names', async () => {
    await renderApp();
    server.use(http.get('*/api/sessions/search', () => HttpResponse.json(found)));

    await userEvent.type(await openPalette(), 'zone');

    const row = await screen.findByRole('option', { name: /Zone 2 plan for October/ });
    expect(row.querySelector('mark')).toHaveTextContent('Zone');
  });

  it('runs the shortcuts of Switch Model, Open Settings and New chat', async () => {
    const { router } = await renderApp();
    await router.navigate({ to: '/s/$id', params: { id: FIRST } });

    await userEvent.keyboard('{Control>}{Shift>}l{/Shift}{/Control}');
    await waitFor(() => expect(useModelPickerStore.getState().isOpen).toBe(true));

    await userEvent.keyboard('{Control>},{/Control}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/settings'));
  });

  it('starts a new chat on Ctrl+E even with the left panel collapsed', async () => {
    const { router } = await renderApp();
    await router.navigate({ to: '/s/$id', params: { id: FIRST } });

    await userEvent.keyboard('{Control>}e{/Control}');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('returns focus to where it was', async () => {
    await renderApp();
    const trigger = await screen.findByRole('button', { name: resources.shell.search });
    trigger.focus();

    await userEvent.keyboard('{Control>}k{/Control}');
    await screen.findByPlaceholderText(resources.commandPalette.placeholder);
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('filters the actions as you type and searches Sessions through the API', async () => {
    const queries: string[] = [];
    await renderApp();
    server.use(
      http.get('*/api/sessions/search', ({ request }) => {
        queries.push(new URL(request.url).searchParams.get('q') ?? '');
        return HttpResponse.json(found);
      }),
    );

    await userEvent.type(await openPalette(), 'zone');

    expect(await screen.findByRole('option', { name: /Zone 2 plan for October/ })).toBeVisible();
    expect(screen.queryByRole('option', { name: /Run events/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /New chat/ })).not.toBeInTheDocument();
    // Typing is debounced into a single request.
    expect(queries).toEqual(['zone']);
  });

  it('shows an empty state when nothing matches', async () => {
    await renderApp();
    server.use(http.get('*/api/sessions/search', () => HttpResponse.json([])));

    await userEvent.type(await openPalette(), 'qqqq');

    expect(await screen.findByText(resources.commandPalette.empty)).toBeVisible();
  });

  it('opens a Session result', async () => {
    const { router } = await renderApp();
    await openPalette();

    await userEvent.click(await screen.findByRole('option', { name: /Run events/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/s/${FIRST}`));
  });

  it('starts a new chat', async () => {
    const { router } = await renderApp();
    await router.navigate({ to: '/s/$id', params: { id: FIRST } });
    await openPalette();

    await userEvent.click(screen.getByRole('option', { name: /New chat/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('opens Settings', async () => {
    const { router } = await renderApp();
    await openPalette();

    await userEvent.click(
      screen.getByRole('option', { name: new RegExp(resources.commandPalette.openSettings) }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/settings'));
  });

  it('opens the Model picker from Switch Model', async () => {
    await renderApp();
    await openPalette();

    await userEvent.click(
      screen.getByRole('option', { name: new RegExp(resources.commandPalette.switchModel) }),
    );

    await waitFor(() => expect(useModelPickerStore.getState().isOpen).toBe(true));
  });

  it('toggles the theme', async () => {
    await renderApp();
    await openPalette();
    const before = document.documentElement.classList.contains('dark');

    await userEvent.click(
      screen.getByRole('option', { name: new RegExp(resources.commandPalette.toggleTheme) }),
    );

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(!before));
  });

  it('offers Open admin to Admins only', async () => {
    const { unmount } = await renderApp(aSession({ isAnonymous: false, role: 'admin' }));
    await openPalette();
    expect(screen.getByRole('option', { name: /Open admin/ })).toHaveTextContent('Admin');
    unmount();
    useSearchStore.setState({ isSearchOpen: false });

    await renderApp(aSession({ isAnonymous: false }));
    await openPalette();

    expect(
      screen.queryByRole('option', { name: resources.commandPalette.openAdmin }),
    ).not.toBeInTheDocument();
  });
});
