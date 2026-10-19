import type { QueryClient } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { SESSION_BOOTSTRAP_KEY } from '@/modules/auth/hooks/useSessionBootstrap';
import { createAppRouter } from '@/routing/router';
import type { AppRouter } from '@/routing/types/types';
import { createTestQueryClient } from '@/test/render';

type Options = Omit<RenderOptions, 'wrapper'> & {
  /** The query client the router context carries; a fresh one (retry off) by default. */
  queryClient?: QueryClient;
};

/** The app's real router loaded at `path`; AuthGate is passed, so the test serves the session. */
export const renderRoute = async (
  path: string,
  { queryClient = createTestQueryClient(), ...options }: Options = {},
): Promise<RenderResult & { router: AppRouter; queryClient: QueryClient }> => {
  queryClient.setQueryData(SESSION_BOOTSTRAP_KEY, null);
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();

  return { ...render(<RouterProvider router={router} />, options), router, queryClient };
};
