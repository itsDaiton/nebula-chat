import { useEffect } from 'react';
import { useModelStore } from '../stores/useModelStore';

export const useModel = (initialModel: string = 'gpt-4o-mini') => {
  const { selectedModel, setSelectedModel } = useModelStore();
  useEffect(() => {
    if (!selectedModel) {
      setSelectedModel(initialModel);
    }
  }, [initialModel, selectedModel, setSelectedModel]);

  return { selectedModel, setSelectedModel };
};
