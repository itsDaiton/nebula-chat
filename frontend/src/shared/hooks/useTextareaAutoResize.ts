import { useLayoutEffect } from 'react';

export const useTextareaAutoResize = (textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
      textarea.style.overflowY = textarea.scrollHeight > 200 ? 'auto' : 'hidden';
    };

    adjustHeight();

    const observer = new ResizeObserver(adjustHeight);
    observer.observe(textarea);

    return () => {
      observer.disconnect();
    };
  }, [textareaRef]);
};
