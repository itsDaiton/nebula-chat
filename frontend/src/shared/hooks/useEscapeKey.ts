import { useCallback, useRef } from 'react';
import { useEventListener } from '@/shared/hooks/useEventListener';

export function useEscapeKey(onEscape: () => void) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEventListener<KeyboardEvent>(
    'keydown',
    useCallback((event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscapeRef.current();
    }, []),
  );
}
