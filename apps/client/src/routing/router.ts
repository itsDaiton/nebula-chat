import { createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import type { AppRouter, AppRouterOptions } from '@/routing/types/types';

export const createAppRouter = ({ queryClient, history }: AppRouterOptions) =>
  createRouter({ routeTree, context: { queryClient }, history });

declare module '@tanstack/react-router' {
  // Declaration merging is how TanStack Router learns the app's routes; a `type` cannot merge.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: AppRouter;
  }
}
