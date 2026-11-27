import { useQueryClient } from '@tanstack/react-query';
import {
  getGetAdminLogLevelsQueryKey,
  getListAuditEntriesQueryKey,
  useChangeAdminLogLevel,
} from '@/libs/api/generated/admin/admin';

/** A change or revert: refreshes the levels and the Audit log; a refusal is toasted by the query client. */
export const useLogLevelChange = (onChanged?: () => void) => {
  const queryClient = useQueryClient();
  return useChangeAdminLogLevel({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetAdminLogLevelsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListAuditEntriesQueryKey() }),
        ]);
        onChanged?.();
      },
    },
  });
};
