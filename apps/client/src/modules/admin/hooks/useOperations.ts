import { useGetAdminOperations } from '@/libs/api/generated/admin/admin';

// No refetch interval: the readout reloads only on Refresh (#903).
export const useOperations = () =>
  useGetAdminOperations({ query: { meta: { inlineError: true } } });
