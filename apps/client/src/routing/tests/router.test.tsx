import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { holdSession } from '@/test/auth';
import { renderRoute } from '@/test/renderRoute';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

beforeEach(async () => {
  await holdSession({});
});

describe('router', () => {
  it('serves the not-found page for a URL no route knows', async () => {
    await renderRoute('/no-such-page');

    expect(screen.getByText(resources.notFound.title)).toBeInTheDocument();
  });

  it('still serves a bridged URL through the legacy tree', async () => {
    await renderRoute(route.auth.root());

    expect(screen.getByRole('heading', { name: resources.auth.signIn.title })).toBeInTheDocument();
    expect(screen.queryByText(resources.notFound.title)).not.toBeInTheDocument();
  });

  it('carries the query client in the router context', async () => {
    const { router, queryClient } = await renderRoute(route.auth.root());

    expect(router.options.context.queryClient).toBe(queryClient);
  });

  it("routes a legacy link's navigation through TanStack Router's history", async () => {
    const { router } = await renderRoute(route.auth.forgotPassword());

    await userEvent.click(screen.getByRole('link', { name: resources.auth.page.backToSignIn }));

    expect(router.state.location.pathname).toBe(route.auth.root());
  });
});
