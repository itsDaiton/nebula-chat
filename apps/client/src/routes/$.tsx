import { createFileRoute, notFound } from '@tanstack/react-router';
import { matchRoutes } from 'react-router';
import { BRIDGED_ROUTES } from '@/routing/bridgedRoutes';
import { LegacyRoutes } from '@/routing/LegacyRoutes';

// The bridge: every URL TanStack Router has no route for yet goes to the legacy react-router tree,
// and one neither router knows is TanStack's not-found.
export const Route = createFileRoute('/$')({
  beforeLoad: ({ location }) => {
    if (!matchRoutes(BRIDGED_ROUTES, location.pathname)) throw notFound();
  },
  component: LegacyRoutes,
});
