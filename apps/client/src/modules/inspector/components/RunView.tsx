import { RunBrief } from '@/modules/inspector/components/RunBrief';
import { RunEndNotice } from '@/modules/inspector/components/RunEndNotice';
import { RunHeader } from '@/modules/inspector/components/RunHeader';
import { RunStepGroup } from '@/modules/inspector/components/RunStepGroup';
import { useRun } from '@/modules/inspector/hooks/useRun';
import type { RunViewProps } from '@/modules/inspector/types/types';
import { groupRunSteps } from '@/modules/inspector/utils/groupRunSteps';
import { resources } from '@/resources';
import { Skeleton } from '@/shared/components/ui/skeleton';

const { run: text } = resources.inspector;

/** How a Run produced its answer: end status, tokens against the Run budget, the Brief and every Step. */
export const RunView = ({ runId }: RunViewProps) => {
  const { data: run, isPending, error } = useRun(runId);

  if (isPending) {
    return (
      <div role="status" aria-label={text.loading} className="flex flex-col gap-3.5 p-3.5">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  if (!run) {
    return (
      <p role="alert" className="p-6 text-center text-[12.5px] text-muted-foreground">
        {error?.code === 'NotFound' ? text.notFound : text.loadFailed}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 p-3.5">
      <RunHeader run={run} />
      <RunEndNotice run={run} />
      {run.brief && <RunBrief brief={run.brief} />}
      <div className="flex flex-col gap-0.5">
        {groupRunSteps(run.steps).map((group) => (
          <RunStepGroup key={group.key} group={group} />
        ))}
      </div>
    </div>
  );
};
