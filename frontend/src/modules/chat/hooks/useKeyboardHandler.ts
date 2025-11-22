import { useRef, useEffect } from 'react';
import type { UseKeyboardHandlerProps } from '../types/types';

const useEventListener = <T extends Event>(
  eventName: string,
  handler: (event: T) => void,
  element: EventTarget = window,
) => {
  useEffect(() => {
    const eventHandler = (event: Event) => handler(event as T);

    if (!element?.addEventListener) return;

    element.addEventListener(eventName, eventHandler);
    return () => {
      element.removeEventListener(eventName, eventHandler);
    };
  }, [eventName, handler, element]);
};

export const useKeyboardHandler = ({
  message,
  isLoading,
  handleMessageSend,
}: UseKeyboardHandlerProps) => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEventListener<KeyboardEvent>('keydown', (e) => {
    if (e.key === 'Enter' && message.trim() && !isLoading) {
      e.preventDefault();
      handleMessageSend();
    } else if (
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) &&
      !e.ctrlKey &&
      !e.metaKey &&
      e.key.length === 1
    ) {
      inputRef.current?.focus();
    }
  });

  return { inputRef };
};
