import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { holdSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { renderRoute } from '@/test/renderRoute';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

beforeEach(async () => {
  await holdSession({});
  serveChatPage();
});

describe('router', () => {
  it('serves the not-found page for a URL no route knows', async () => {
    await renderRoute('/no-such-page');

    expect(screen.getByText(resources.notFound.title)).toBeInTheDocument();
  });

  it('still serves a bridged URL through the legacy tree', async () => {
    const { router } = await renderRoute(route.chat.root());

    expect(await screen.findByText(resources.chat.welcomeMessage)).toBeInTheDocument();
    expect(router.state.matches.at(-1)?.routeId).toBe('/$');
  });

  it.each([
    route.auth.root(),
    route.auth.forgotPassword(),
    route.auth.resetPassword(),
    route.auth.verifyEmail(),
  ])('serves %s through its own route, not the bridge', async (path) => {
    const { router } = await renderRoute(path);

    expect(router.state.matches.at(-1)?.routeId).toMatch(/^\/auth\//);
    expect(screen.queryByText(resources.notFound.title)).not.toBeInTheDocument();
  });

  it('carries the query client in the router context', async () => {
    const { router, queryClient } = await renderRoute(route.auth.root());

    expect(router.options.context.queryClient).toBe(queryClient);
  });

  it("routes a legacy link's navigation through TanStack Router's history", async () => {
    const { router } = await renderRoute(route.chat.root());

    await userEvent.click(await screen.findByRole('link', { name: resources.auth.actions.signIn }));

    expect(router.state.location.pathname).toBe(route.auth.root());
    expect(
      await screen.findByRole('heading', { name: resources.auth.signIn.title }),
    ).toBeInTheDocument();
  });

  it('goes back between the auth pages with the browser history', async () => {
    const { router } = await renderRoute(route.auth.root());

    await userEvent.click(screen.getByRole('link', { name: resources.auth.signIn.forgotPassword }));
    expect(
      await screen.findByRole('heading', { name: resources.auth.forgotPassword.title }),
    ).toBeInTheDocument();

    router.history.back();

    expect(
      await screen.findByRole('heading', { name: resources.auth.signIn.title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(route.auth.root());
  });
});
