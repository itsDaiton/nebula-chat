import { useCallback, useRef, useSyncExternalStore } from 'react';

export const useEventListener = <T extends Event>(
  eventName: string,
  handler: (event: T) => void,
  element: EventTarget = globalThis,
) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useSyncExternalStore(
    useCallback(() => {
      if (!element?.addEventListener) return () => {};
      const wrappedHandler = (event: Event) => handlerRef.current(event as T);
      element.addEventListener(eventName, wrappedHandler);
      return () => element.removeEventListener(eventName, wrappedHandler);
    }, [element, eventName]),
    () => null,
  );
};
