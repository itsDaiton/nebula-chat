import { useState, useLayoutEffect } from 'react';
import { modelOptions } from '../utils/chatUtils';

export const useModelSelector = ({ selectedModel }: { selectedModel: string }) => {
  const [triggerWidth, setTriggerWidth] = useState<number>(120);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  useLayoutEffect(() => {
    const label = modelOptions.items.find((i) => i.value === selectedModel)?.label || '';
    const padding = 48;
    const min = 120;
    const textWidth = label.length * 8;
    setTriggerWidth(Math.max(min, Math.round(textWidth + padding)));
  }, [selectedModel]);

  return {
    triggerWidth,
    isSelectOpen,
    setIsSelectOpen,
  };
};
