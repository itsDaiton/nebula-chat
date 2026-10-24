import type { QueryClient } from '@tanstack/react-query';
import type { RouterHistory } from '@tanstack/react-router';
import type { createAppRouter } from '@/routing/router';

/** What every TanStack route can read from `context` (and the root hands to its providers). */
export type RouterContext = {
  queryClient: QueryClient;
};

/** Tests pass a memory history; the app leaves it to the browser's. */
export type AppRouterOptions = RouterContext & {
  history?: RouterHistory;
};

export type AppRouter = ReturnType<typeof createAppRouter>;
