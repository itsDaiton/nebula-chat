import { lazy } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';

// Development only: a production build folds DEV to false, so the page's chunk is dropped and the route is not-found.
const ChartsDemoPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/shared/pages/ChartsDemoPage').then(({ ChartsDemoPage: page }) => ({
        default: page,
      })),
    )
  : () => null;

export const Route = createFileRoute('/dev/charts')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: ChartsDemoPage,
});
