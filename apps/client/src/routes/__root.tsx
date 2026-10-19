import { createRootRouteWithContext } from '@tanstack/react-router';
import { RootLayout } from '@/routing/RootLayout';
import type { RouterContext } from '@/routing/types/types';
import { NotFound } from '@/shared/pages/NotFound';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});
