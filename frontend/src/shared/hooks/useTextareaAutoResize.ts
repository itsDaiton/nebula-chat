import { useLayoutEffect } from 'react';

const MAX_TEXTAREA_HEIGHT = 200;

export const useTextareaAutoResize = (textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
      textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
    };

    adjustHeight();

    const observer = new ResizeObserver(adjustHeight);
    observer.observe(textarea);

    return () => {
      observer.disconnect();
    };
  }, [textareaRef]);
};
