import { useCallback, useRef } from 'react';
import type { UseInfiniteScrollOptions } from '@/modules/conversations/types/types';

export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 0.5,
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observerTarget = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (!node) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const [target] = entries;
          if (target.isIntersecting && hasMore && !isLoading) {
            void onLoadMore();
          }
        },
        { threshold },
      );
      observerRef.current = observer;
      observer.observe(node);
    },
    [hasMore, isLoading, onLoadMore, threshold],
  );

  return observerTarget;
}
