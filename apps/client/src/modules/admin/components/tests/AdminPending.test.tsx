import { screen, within } from '@testing-library/react';
import { delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@/resources';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { API_ROUTE } from '@/test/api';
import { aSession, mockGetSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

vi.mock('@/shared/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isMobile: false, showSidePanels: true, showRightPanel: true }),
}));

beforeEach(() => {
  serveChatPage();
  server.use(mockGetSession(aSession({})));
  usePanelStore.setState({ leftOpen: true, rightOpen: true, sheetOpen: false });
});

describe('Admin pending shell', () => {
  it('keeps the admin navigation on screen with a loading body while the admin guard waits', async () => {
    const { router } = await renderRoute('/');
    // The admin guard reads the auth session; holding it keeps /admin pending.
    server.use(http.get(API_ROUTE.authSession, () => delay('infinite')));

    void router.navigate({ to: '/admin' });

    expect(
      await screen.findByRole('status', { name: resources.admin.loading }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: resources.routing.loading })).toBeNull();
    const nav = screen.getByRole('navigation', { name: resources.admin.nav.label });
    expect(
      within(nav).getByRole('link', { name: resources.admin.nav.overview }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: resources.admin.overview.title })).toBeNull();
  });
});
