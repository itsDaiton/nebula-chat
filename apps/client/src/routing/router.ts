import type { QueryClient } from '@tanstack/react-query';
import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';

/** The app's router; tests pass a memory history, the app the browser's (the default). */
export const createAppRouter = ({
  queryClient,
  history,
}: {
  queryClient: QueryClient;
  history?: RouterHistory;
}) => createRouter({ routeTree, context: { queryClient }, history });

declare module '@tanstack/react-router' {
  // Declaration merging is how TanStack Router learns the app's routes; a `type` cannot merge.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
