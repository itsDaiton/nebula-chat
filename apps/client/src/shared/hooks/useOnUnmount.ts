import { useCallback, useRef } from 'react';

/** A ref callback that runs `callback` when its element leaves the screen: the effect-free way to reset state that must not outlive its UI. */
export const useOnUnmount = (callback: () => void) => {
  const latest = useRef(callback);
  latest.current = callback;

  return useCallback((node: HTMLElement | null) => (node ? () => latest.current() : undefined), []);
};
