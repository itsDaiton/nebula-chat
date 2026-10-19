import { useRoutes } from 'react-router';
import { BRIDGED_ROUTES } from '@/routing/bridgedRoutes';

/** The legacy react-router tree; TanStack's bridge only renders it for a URL it matches. */
export const LegacyRoutes = () => useRoutes(BRIDGED_ROUTES);
