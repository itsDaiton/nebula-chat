import { lazy } from 'react';

/**
 * TanStack Router's devtools under `vite dev` only. Not on `import.meta.env.DEV`, which Vitest
 * sets too; a production build replaces `MODE`, so the import is dropped from the bundle.
 */
export const RouterDevtools =
  import.meta.env.MODE === 'development'
    ? lazy(() =>
        import('@tanstack/react-router-devtools').then(({ TanStackRouterDevtools }) => ({
          default: TanStackRouterDevtools,
        })),
      )
    : () => null;
