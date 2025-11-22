import { useState, useLayoutEffect } from 'react';
import { modelOptions } from '../utils/chatUtils';

const MIN_TRIGGER_WIDTH = 120;
const PADDING_WIDTH = 48;

export const useModelSelector = ({ selectedModel }: { selectedModel: string }) => {
  const [triggerWidth, setTriggerWidth] = useState<number>(120);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  useLayoutEffect(() => {
    const label = modelOptions.items.find((i) => i.value === selectedModel)?.label || '';
    const textWidth = label.length * 8;
    setTriggerWidth(Math.max(MIN_TRIGGER_WIDTH, Math.round(textWidth + PADDING_WIDTH)));
  }, [selectedModel]);

  return {
    triggerWidth,
    isSelectOpen,
    setIsSelectOpen,
  };
};
