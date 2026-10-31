import { lazy } from 'react';

// Opt-in via `VITE_ENABLE_DEVTOOLS=true` under `vite dev` only (Vitest sets `DEV` too;
// a production build drops the import with `MODE`).
export const RouterDevtools =
  import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEVTOOLS === 'true'
    ? lazy(() =>
        import('@tanstack/react-router-devtools').then(({ TanStackRouterDevtools }) => ({
          default: TanStackRouterDevtools,
        })),
      )
    : () => null;
