import { MODEL_CATALOG } from '@nebula-chat/contracts';

export const modelService = {
  listModels() {
    return [...MODEL_CATALOG];
  },
};
