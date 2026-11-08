import type { ModelCatalog } from '@/libs/api/generated/model/modelCatalog';
import { useGetModelCatalog } from '@/libs/api/generated/models/models';
import type { ModelCatalogView } from '@/modules/chat/types/types';

// The catalog only changes with a deploy, and the server lets caches keep it for an hour.
export const MODEL_CATALOG_STALE_TIME = 60 * 60 * 1000;

const toModelCatalogView = ({ models, defaultModels }: ModelCatalog): ModelCatalogView => {
  // The catalog has one default per provider, so the first listed Model's provider picks which applies.
  const first = models[0];
  return {
    options: models.map(({ id, label, provider, contextWindow, maxOutput }) => ({
      value: id,
      label,
      provider,
      contextWindow,
      maxOutput,
    })),
    defaultModel: first && (defaultModels[first.provider] ?? first.id),
  };
};

export const useModelCatalog = () => {
  const query = useGetModelCatalog({
    query: {
      staleTime: MODEL_CATALOG_STALE_TIME,
      select: toModelCatalogView,
      // The picker shows its own failure, and every other reader falls back to the id.
      meta: { inlineError: true },
    },
  });
  const options = query.data?.options ?? [];

  return {
    options,
    defaultModel: query.data?.defaultModel,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    getModelLabel: (id: string) => options.find((option) => option.value === id)?.label ?? id,
  };
};
