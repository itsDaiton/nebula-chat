import { RunStatusBadge } from '@/modules/inspector/components/RunStatusBadge';
import { useRun } from '@/modules/inspector/hooks/useRun';
import type { RunViewProps } from '@/modules/inspector/types/types';

/** The selected Run's status beside the Run tab's name. */
export const RunTabBadge = ({ runId }: RunViewProps) => {
  const { data: run } = useRun(runId);
  return run ? <RunStatusBadge status={run.status} className="h-4 px-1 text-[9.5px]" /> : null;
};
