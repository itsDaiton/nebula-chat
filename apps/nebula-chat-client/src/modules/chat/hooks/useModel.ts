import { useModelStore } from '@/modules/chat/stores/useModelStore';

export const useModel = () => {
  const { selectedModel, setSelectedModel } = useModelStore();
  return { selectedModel, setSelectedModel };
};
