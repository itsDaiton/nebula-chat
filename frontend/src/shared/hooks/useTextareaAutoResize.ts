import { useLayoutEffect } from 'react';

const MAX_TEXTAREA_HEIGHT = 200;

export const useTextareaAutoResize = (textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;

      textarea.style.height = '';
      const minHeight = textarea.offsetHeight;

      const newHeight = Math.min(Math.max(scrollHeight, minHeight), MAX_TEXTAREA_HEIGHT);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
    };

    adjustHeight();
    textarea.addEventListener('input', adjustHeight);

    return () => {
      textarea.removeEventListener('input', adjustHeight);
    };
  }, [textareaRef]);
};
