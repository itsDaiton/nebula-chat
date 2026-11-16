import { tableFeatures } from '@tanstack/react-table';

// The server pages and orders every admin table, so no client-side row model or feature is needed.
export const adminTableFeatures = tableFeatures({});
