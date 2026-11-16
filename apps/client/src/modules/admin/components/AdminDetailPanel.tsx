import { XIcon } from 'lucide-react';
import { useAdminDetailStore } from '@/modules/admin/stores/useAdminDetailStore';
import type { AdminDetailPanelProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { IconButton } from '@/shared/components/ui/icon-button';

/** The right panel: the selected row's detail, or nothing until a row of this page is picked. */
export const AdminDetailPanel = ({ path, onClose }: AdminDetailPanelProps) => {
  const selection = useAdminDetailStore((state) => state.selection);
  const clear = useAdminDetailStore((state) => state.clear);
  const current = selection?.path === path ? selection : null;

  const close = () => {
    clear();
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate font-mono text-[13px] font-medium">{current?.title}</h2>
        <IconButton
          variant="ghost"
          size="icon"
          label={resources.admin.detail.close}
          onClick={close}
        >
          <XIcon />
        </IconButton>
      </div>
      {current?.detail ?? (
        <p className="text-[12.5px] text-muted-foreground">{resources.admin.detail.empty}</p>
      )}
    </div>
  );
};
