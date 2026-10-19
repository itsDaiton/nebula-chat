import { lazy } from 'react';

// `vite dev` only: Vitest sets `DEV` too, and a production build drops the import with `MODE`.
export const RouterDevtools =
  import.meta.env.MODE === 'development'
    ? lazy(() =>
        import('@tanstack/react-router-devtools').then(({ TanStackRouterDevtools }) => ({
          default: TanStackRouterDevtools,
        })),
      )
    : () => null;
