import { useIsMutating } from '@tanstack/react-query';
import { Undo2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { getChangeAdminLogLevelMutationKey } from '@/libs/api/generated/admin/admin';
import { useLogLevelChange } from '@/modules/admin/hooks/useLogLevelChange';
import type { LogLevelRevertButtonProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const text = resources.admin.operations;

export const LogLevelRevertButton = ({ row }: LogLevelRevertButtonProps) => {
  const revert = useLogLevelChange(() =>
    toast.success(text.logLevels.reverted(text.services[row.service], row.target)),
  );
  // One change at a time: another row's revert or the panel's apply disables this one.
  const changing = useIsMutating({ mutationKey: getChangeAdminLogLevelMutationKey() }) > 0;

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={revert.isPending}
      disabled={changing && !revert.isPending}
      onClick={() =>
        revert.mutate({
          data: {
            service: row.service,
            ...(row.target !== 'root' && { component: row.target }),
            revert: true,
          },
        })
      }
    >
      <Undo2Icon />
      {text.logLevels.revert}
    </Button>
  );
};
