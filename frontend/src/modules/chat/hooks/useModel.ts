import { useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';

export const useModel = (initialModel: string = 'gpt-4o-mini') => {
  const { selectedModel, setSelectedModel } = useChatStore();
  useEffect(() => {
    if (!selectedModel) {
      setSelectedModel(initialModel);
    }
  }, [initialModel, selectedModel, setSelectedModel]);

  return { selectedModel, setSelectedModel };
};
