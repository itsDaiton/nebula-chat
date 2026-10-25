import { useRouter } from '@tanstack/react-router';
import { useCallback, useRef, useSyncExternalStore } from 'react';

// Subscribes through useSyncExternalStore's lifecycle, as useEventListener does, so no effect is needed.
export const useOnNavigate = (callback: () => void) => {
  const router = useRouter();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useSyncExternalStore(
    useCallback(() => router.subscribe('onBeforeNavigate', () => callbackRef.current()), [router]),
    () => null,
  );
};
