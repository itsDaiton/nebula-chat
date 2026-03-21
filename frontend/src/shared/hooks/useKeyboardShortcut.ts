import { useCallback, useRef } from 'react';
import { useEventListener } from '@/shared/hooks/useEventListener';

export const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  options?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
  },
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEventListener<KeyboardEvent>(
    'keydown',
    useCallback(
      (event: KeyboardEvent) => {
        const isModifier = event.ctrlKey || event.metaKey;
        const ctrlMatch = options?.ctrl ? isModifier : !event.ctrlKey && !event.metaKey;
        const shiftMatch = options?.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = options?.alt ? event.altKey : !event.altKey;

        if (event.key.toLowerCase() === key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          callbackRef.current();
        }
      },
      [key, options?.ctrl, options?.shift, options?.alt],
    ),
    document,
  );
};
