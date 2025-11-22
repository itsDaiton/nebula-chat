import { useEffect, useRef, useState } from 'react';

export const useMultiLine = (content: string) => {
  const [isMultiLine, setIsMultiLine] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textRef.current) return;

    const styles = getComputedStyle(textRef.current);
    let lineHeight = parseInt(styles.lineHeight);
    if (isNaN(lineHeight)) {
      const fontSize = parseFloat(styles.fontSize);
      lineHeight = fontSize * 1.2;
    }

    const height = textRef.current.getBoundingClientRect().height;
    setIsMultiLine(height > lineHeight * 1.5);
  }, [content]);

  return {
    isMultiLine,
    textRef,
  };
};
