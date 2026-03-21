import { useModelStore } from '../stores/useModelStore';

export const useModel = () => {
  const { selectedModel, setSelectedModel } = useModelStore();
  return { selectedModel, setSelectedModel };
};
