import { Skeleton } from '@/shared/components/ui/skeleton';

// Shared by the Overview's first load and the admin pending shell, which lands on the Overview.
export const OverviewTilesSkeleton = () => (
  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }, (_, index) => (
      <Skeleton key={index} className="h-[7.5rem] rounded-xl" />
    ))}
  </div>
);
