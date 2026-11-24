import { getRouteApi, useSearch } from '@tanstack/react-router';
import { EyeIcon, XIcon } from 'lucide-react';
import type { RunDetailPanelProps } from '@/modules/admin/types/types';
import { RunView } from '@/modules/inspector/components/RunView';
import { resources } from '@/resources';
import { IconButton } from '@/shared/components/ui/icon-button';

const route = getRouteApi('/_app/admin/runs');
const text = resources.admin.runs.detail;

/** The Runs page's right panel: the Run whose id is `selected` in the URL, under a notice that reading it was audited. */
export const RunDetailPanel = ({ onClose }: RunDetailPanelProps) => {
  // Not strict: the panel can outlive its route for a render while the dashboard navigates away.
  const { selected } = useSearch({ strict: false });
  const navigate = route.useNavigate();

  const close = () => {
    void navigate({ search: (previous) => ({ ...previous, selected: undefined }), replace: true });
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-start gap-2.5 border-b border-border p-3.5 text-[13px] text-muted-foreground">
        <EyeIcon className="mt-0.5 size-4 shrink-0" />
        <p>{selected ? text.notice : resources.admin.detail.empty}</p>
        <IconButton
          variant="ghost"
          size="icon"
          label={resources.admin.detail.close}
          className="ml-auto"
          onClick={close}
        >
          <XIcon />
        </IconButton>
      </header>
      {selected && <RunView runId={selected} audited />}
    </div>
  );
};
