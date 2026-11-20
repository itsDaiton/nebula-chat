import { createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import type { AppRouterOptions } from '@/routing/types/types';
import { RoutePending } from '@/shared/components/RoutePending';

export const createAppRouter = ({ queryClient, history }: AppRouterOptions) =>
  createRouter({
    routeTree,
    context: { queryClient },
    history,
    // A quick navigation shows nothing; a slow one shows a spinner long enough not to flicker.
    defaultPendingComponent: RoutePending,
    defaultPendingMs: 150,
    defaultPendingMinMs: 300,
  });

// Lives beside the factory it derives from; in types.ts it would import this file back.
export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  // Declaration merging is how TanStack Router learns the app's routes; a `type` cannot merge.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: AppRouter;
  }
}
