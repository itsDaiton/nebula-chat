import type { ChatMessageSkeletonProps } from '@/modules/chat/types/types';
import { Skeleton } from '@/shared/components/ui/skeleton';

export const ChatMessageSkeleton = ({ isUser = false }: ChatMessageSkeletonProps) =>
  isUser ? (
    <div className="mt-1.5 mb-[22px] flex justify-end">
      <Skeleton className="h-10 w-3/5 rounded-[18px_18px_6px_18px]" />
    </div>
  ) : (
    <div className="mb-[26px] space-y-2.5">
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-9/12" />
    </div>
  );
