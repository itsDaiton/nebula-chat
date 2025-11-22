import { useEffect } from 'react';

export const useEventListener = <T extends Event>(
  eventName: string,
  handler: (event: T) => void,
  element: EventTarget = window,
) => {
  useEffect(() => {
    if (!element?.addEventListener) return;

    element.addEventListener(eventName, handler as EventListener);
    return () => {
      element.removeEventListener(eventName, handler as EventListener);
    };
  }, [eventName, handler, element]);
};
