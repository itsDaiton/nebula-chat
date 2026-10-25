import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '@/shared/components/layout/Header';
import { resources } from '@/resources';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderInRouter } from '@/test/renderRoute';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  server.use(mockGetSession(aSession()));
});

describe('Header', () => {
  it('links the app name home', async () => {
    const { router } = await renderInRouter(<Header />, { path: '/s/abc' });

    await userEvent.click(screen.getByRole('link', { name: resources.shell.home }));

    expect(router.state.location.pathname).toBe('/');
  });

  it("shows a Guest's sign-in link and the theme toggle, without the old gear menu", async () => {
    await renderInRouter(<Header />);
    refreshSession();

    expect(
      await screen.findByRole('link', { name: resources.auth.actions.signIn }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: resources.userMenu.label }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: resources.shell.toggleTheme })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
  });
});
