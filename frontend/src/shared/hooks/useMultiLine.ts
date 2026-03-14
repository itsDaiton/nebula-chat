import { useEffect, useRef, useState } from 'react';

const MULTILINE_THRESHOLD = 1.5;
const DEFAULT_LINE_HEIGHT_THRESHOLD = 1.2;

export const useMultiLine = (content: string) => {
  const [isMultiLine, setIsMultiLine] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textRef.current) return;

    const styles = getComputedStyle(textRef.current);
    let lineHeight = Number.parseInt(styles.lineHeight);
    if (Number.isNaN(lineHeight)) {
      const fontSize = Number.parseFloat(styles.fontSize);
      lineHeight = fontSize * DEFAULT_LINE_HEIGHT_THRESHOLD;
    }

    const height = textRef.current.getBoundingClientRect().height;
    setIsMultiLine(height > lineHeight * MULTILINE_THRESHOLD);
  }, [content]);

  return {
    isMultiLine,
    textRef,
  };
};
