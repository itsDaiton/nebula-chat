import { Skeleton } from '@/shared/components/ui/skeleton';
import { paginationConfig } from '@/shared/config/paginationConfig';
import type { SessionListSkeletonsProps } from '@/modules/sessions/types/types';

export const SessionSkeletons = ({
  count = paginationConfig.defaultLimit,
}: SessionListSkeletonsProps) => (
  <div className="flex flex-col gap-px">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex h-8 items-center px-2">
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    ))}
  </div>
);
