import { useEffect } from 'react';
import { scrollToBottom } from '@/shared/utils/scrollUtils';

export const useAutoScroll = (ref: React.RefObject<HTMLDivElement | null>, dependencies: any[]) => {
  useEffect(() => {
    if (ref.current) {
      scrollToBottom(ref);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...dependencies]);
};
