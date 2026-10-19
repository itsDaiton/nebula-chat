import type { QueryClient } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { SESSION_BOOTSTRAP_KEY } from '@/modules/auth/hooks/useSessionBootstrap';
import { createAppRouter } from '@/routing/router';
import { createTestQueryClient } from '@/test/render';

type Options = Omit<RenderOptions, 'wrapper'> & {
  /** The query client the router context carries; a fresh one (retry off) by default. */
  queryClient?: QueryClient;
};

/**
 * Boots the app's real router at `path` on a memory history, with the root route's providers
 * around the page: the page seam, so a test drives a route as the app would.
 *
 * AuthGate's bootstrap is marked done, so the test serves the session itself (`holdSession`,
 * `mockGetSession`) and the page renders at once rather than behind the gate's spinner. The
 * router has loaded `path` before the first render; a navigation after it is awaited with
 * `findBy*`, or through the returned `router`.
 */
export const renderRoute = async (
  path: string,
  { queryClient = createTestQueryClient(), ...options }: Options = {},
): Promise<
  RenderResult & { router: ReturnType<typeof createAppRouter>; queryClient: QueryClient }
> => {
  queryClient.setQueryData(SESSION_BOOTSTRAP_KEY, null);
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();

  return { ...render(<RouterProvider router={router} />, options), router, queryClient };
};
