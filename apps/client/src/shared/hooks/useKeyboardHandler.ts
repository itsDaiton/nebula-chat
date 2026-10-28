import { useCallback, useRef } from 'react';
import type { UseKeyboardHandlerProps } from '@/modules/chat/types/types';
import { useEventListener } from '@/shared/hooks/useEventListener';
import { useSearchStore } from '@/shared/stores/useSearchStore';

export const useKeyboardHandler = ({
  message,
  isLoading,
  handleMessageSend,
}: UseKeyboardHandlerProps) => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { isSearchOpen } = useSearchStore();

  const keyboardHandler = useCallback(
    (e: KeyboardEvent) => {
      const isPrintableKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey;

      const isOnControl =
        e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement;

      // Shift+Enter is a newline, and Enter on a focused control (or in an IME composition) is not a send.
      if (
        e.key === 'Enter' &&
        !e.shiftKey &&
        !e.isComposing &&
        !isOnControl &&
        message.trim() &&
        !isLoading
      ) {
        e.preventDefault();
        handleMessageSend();
      } else if (
        isPrintableKey &&
        !isSearchOpen &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        inputRef.current?.focus();
      }
    },
    [message, isLoading, handleMessageSend, isSearchOpen],
  );

  useEventListener<KeyboardEvent>('keydown', keyboardHandler);

  return { inputRef };
};
