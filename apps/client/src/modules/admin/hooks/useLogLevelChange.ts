import { useQueryClient } from '@tanstack/react-query';
import {
  getGetAdminLogLevelsQueryKey,
  getListAuditEntriesQueryKey,
  useChangeAdminLogLevel,
} from '@/libs/api/generated/admin/admin';
import { untilExpired } from '@/modules/admin/utils/logLevels';

/** A change or revert: refreshes the levels and the Audit log (a revert once it has landed); a refusal is toasted by the query client. */
export const useLogLevelChange = (onChanged?: () => void) => {
  const queryClient = useQueryClient();
  return useChangeAdminLogLevel({
    mutation: {
      onSuccess: async (result, { data }) => {
        if ('revert' in data) await untilExpired(result.expiresAt);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetAdminLogLevelsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListAuditEntriesQueryKey() }),
        ]);
        onChanged?.();
      },
    },
  });
};
