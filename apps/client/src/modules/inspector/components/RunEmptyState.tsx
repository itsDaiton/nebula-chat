import { WorkflowIcon } from 'lucide-react';
import { resources } from '@/resources';

export const RunEmptyState = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-2.5 p-6 text-center text-[12.5px] text-muted-foreground">
    <div className="flex size-10 items-center justify-center rounded-xl border border-dashed border-border-strong text-faint">
      <WorkflowIcon className="size-[18px]" />
    </div>
    <p className="text-[13px] font-medium text-foreground-secondary">
      {resources.inspector.run.emptyTitle}
    </p>
    <p>{resources.inspector.run.emptyHint}</p>
  </div>
);
