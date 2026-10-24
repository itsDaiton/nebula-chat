import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { SESSION_BOOTSTRAP_KEY } from '@/modules/auth/utils/sessionBootstrap';
import { createAppRouter } from '@/routing/router';
import type { AppRouter } from '@/routing/types/types';
import { createTestQueryClient } from '@/test/render';

type Options = Omit<RenderOptions, 'wrapper'> & {
  /** The query client the router context carries; a fresh one (retry off) by default. */
  queryClient?: QueryClient;
  /** False leaves the session guard to bootstrap the session, as the app does on page load. */
  seedSession?: boolean;
};

/** The app's real router loaded at `path`; the session guard is passed, so the test serves the session. */
export const renderRoute = async (
  path: string,
  { queryClient = createTestQueryClient(), seedSession = true, ...options }: Options = {},
): Promise<RenderResult & { router: AppRouter; queryClient: QueryClient }> => {
  if (seedSession) queryClient.setQueryData(SESSION_BOOTSTRAP_KEY, null);
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  // An unseeded session is the guard's to resolve while the router renders, so its loading state shows.
  if (seedSession) await router.load();

  return { ...render(<RouterProvider router={router} />, options), router, queryClient };
};

/** `ui` as the page of `/` and `/s/$id`, under the app's providers but not its routes: for a component that links or reads the route. */
export const renderInRouter = async (
  ui: ReactElement,
  {
    path = '/',
    queryClient = createTestQueryClient(),
  }: { path?: string; queryClient?: QueryClient } = {},
) => {
  const rootRoute = createRootRoute({ component: Outlet });
  const page = (pagePath: string) =>
    createRoute({ getParentRoute: () => rootRoute, path: pagePath, component: () => ui });
  const landing = createRoute({
    getParentRoute: () => rootRoute,
    path: '$',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([page('/'), page('/s/$id'), landing]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={defaultSystem}>
          <RouterProvider router={router} />
        </ChakraProvider>
      </QueryClientProvider>,
    ),
    router,
  };
};
