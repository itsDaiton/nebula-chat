import { useLayoutEffect } from 'react';
import { modelOptions } from '../utils/chatUtils';
import { useModelSelectorStore } from '../stores/useModelSelectorStore';

const MIN_TRIGGER_WIDTH = 120;
const PADDING_WIDTH = 48;

export const useModelSelector = ({ selectedModel }: { selectedModel: string }) => {
  const { triggerWidth, isSelectOpen, setIsSelectOpen, setTriggerWidth } = useModelSelectorStore();

  useLayoutEffect(() => {
    const label = modelOptions.items.find((i) => i.value === selectedModel)?.label || '';
    const textWidth = label.length * 8;
    setTriggerWidth(Math.max(MIN_TRIGGER_WIDTH, Math.round(textWidth + PADDING_WIDTH)));
  }, [selectedModel, setTriggerWidth]);

  return {
    triggerWidth,
    isSelectOpen,
    setIsSelectOpen,
  };
};
