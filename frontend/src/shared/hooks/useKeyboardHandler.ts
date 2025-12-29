import { useCallback, useRef } from 'react';
import type { UseKeyboardHandlerProps } from '../../modules/chat/types/types';
import { useEventListener } from '@/shared/hooks/useEventListener';
import { useSearchState } from '@/shared/context/SearchStateContext';

export const useKeyboardHandler = ({
  message,
  isLoading,
  handleMessageSend,
}: UseKeyboardHandlerProps) => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { isSearchOpen } = useSearchState();

  const keyboardHandler = useCallback(
    (e: KeyboardEvent) => {
      const isPrintableKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey;

      if (e.key === 'Enter' && message.trim() && !isLoading) {
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
