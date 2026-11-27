import { useGetAdminOperations } from '@/libs/api/generated/admin/admin';

// No refetch interval: the readout reloads only on Refresh, so opening the page wakes nothing.
export const useOperations = () =>
  useGetAdminOperations({ query: { meta: { inlineError: true } } });
