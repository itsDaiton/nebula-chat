import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getListConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { SettingsPage } from '@/modules/settings/SettingsPage';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { holdSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

const layout = vi.hoisted(() => ({
  isMobile: false,
  showSidePanels: true,
  showRightPanel: false,
}));
vi.mock('@/shared/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => layout }));

const AUTH_PAGE = 'auth page';

const renderPage = () =>
  renderWithChakra(
    <Routes>
      <Route path={route.settings.root()} element={<SettingsPage />} />
      <Route path={route.auth.root()} element={AUTH_PAGE} />
    </Routes>,
    { route: route.settings.root() },
  );

beforeEach(() => {
  server.use(
    getListConversationsMockHandler({
      conversations: [{ id: 'c-1', title: 'Earlier chat', createdAt: '2026-06-15T11:00:00.000Z' }],
      nextCursor: null,
      hasMore: false,
    }),
  );
});

describe('SettingsPage', () => {
  it('shows a Registered user the settings and its Password section inside the app shell', async () => {
    await holdSession({ isAnonymous: false });

    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: resources.settings.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: resources.settings.password.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(await screen.findByText('Earlier chat')).toBeInTheDocument();
  });

  it('sends a Guest to the auth page', async () => {
    await holdSession({ isAnonymous: true });

    renderPage();

    expect(screen.getByText(AUTH_PAGE)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: resources.settings.title }),
    ).not.toBeInTheDocument();
  });
});
