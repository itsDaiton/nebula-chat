import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import { useModelStore } from '@/modules/chat/stores/useModelStore';

export const useModel = () => {
  const { selectedModel, setSelectedModel } = useModelStore();
  const { options, defaultModel } = useModelCatalog();
  // A pick the catalog no longer lists falls back to its default; nothing resolves before it loads.
  const isUnlisted =
    options.length > 0 && !options.some((option) => option.value === selectedModel);

  return {
    selectedModel: isUnlisted && defaultModel ? defaultModel : selectedModel,
    setSelectedModel,
  };
};
