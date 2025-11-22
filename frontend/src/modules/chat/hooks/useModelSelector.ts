import { useState, useLayoutEffect, useRef } from 'react';
import { modelOptions } from '../utils/chatUtils';

interface UseModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export const useModelSelector = ({ selectedModel, onModelChange }: UseModelSelectorProps) => {
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const measureRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const label = modelOptions.items.find((i) => i.value === selectedModel)?.label || '';
    const el = measureRef.current;
    if (!el) return;
    el.textContent = label;
    const rect = el.getBoundingClientRect();
    const padding = 48; // account for internal padding + chevron
    const min = 120;
    setTriggerWidth(Math.max(min, Math.round(rect.width + padding)));
  }, [selectedModel]);

  return {
    triggerWidth,
    isSelectOpen,
    setIsSelectOpen,
    measureRef,
  };
};
