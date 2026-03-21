import { useEffect, useRef } from 'react';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';

const MULTILINE_THRESHOLD = 1.5;
const DEFAULT_LINE_HEIGHT_THRESHOLD = 1.2;

export const useMultiLine = (content: string) => {
  const { multiLineMap, setIsMultiLine, removeEntry } = useMultiLineStore();
  const textRef = useRef<HTMLDivElement>(null);
  const isMultiLine = multiLineMap[content] ?? false;

  useEffect(() => {
    if (!textRef.current) return;

    const styles = getComputedStyle(textRef.current);
    let lineHeight = Number.parseInt(styles.lineHeight);
    if (Number.isNaN(lineHeight)) {
      const fontSize = Number.parseFloat(styles.fontSize);
      lineHeight = fontSize * DEFAULT_LINE_HEIGHT_THRESHOLD;
    }

    const height = textRef.current.getBoundingClientRect().height;
    setIsMultiLine(content, height > lineHeight * MULTILINE_THRESHOLD);

    return () => {
      removeEntry(content);
    };
  }, [content, setIsMultiLine, removeEntry]);

  return { isMultiLine, textRef };
};
