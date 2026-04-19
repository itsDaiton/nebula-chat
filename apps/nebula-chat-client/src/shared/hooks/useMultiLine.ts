import { useCallback } from 'react';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';

const MULTILINE_THRESHOLD = 1.5;
const DEFAULT_LINE_HEIGHT_THRESHOLD = 1.2;

export const useMultiLine = (content: string) => {
  const { multiLineMap, setIsMultiLine, removeEntry } = useMultiLineStore();
  const isMultiLine = multiLineMap[content] ?? false;

  const textRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        removeEntry(content);
        return;
      }

      const styles = getComputedStyle(node);
      let lineHeight = Number.parseInt(styles.lineHeight);
      if (Number.isNaN(lineHeight)) {
        const fontSize = Number.parseFloat(styles.fontSize);
        lineHeight = fontSize * DEFAULT_LINE_HEIGHT_THRESHOLD;
      }

      const height = node.getBoundingClientRect().height;
      setIsMultiLine(content, height > lineHeight * MULTILINE_THRESHOLD);
    },
    [content, setIsMultiLine, removeEntry],
  );

  return { isMultiLine, textRef };
};
