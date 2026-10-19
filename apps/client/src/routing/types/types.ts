import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/** What every TanStack route can read from `context` (and the root hands to its providers). */
export type RouterContext = {
  queryClient: QueryClient;
};

export type LegacyRouterProps = {
  children: ReactNode;
};
