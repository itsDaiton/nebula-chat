import { useEffect } from 'react';

export const useTextareaAutoResize = (textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = newHeight === 200 ? 'auto' : 'hidden';
    };

    textarea.addEventListener('input', adjustHeight);
    return () => textarea.removeEventListener('input', adjustHeight);
  }, [textareaRef]);
};
