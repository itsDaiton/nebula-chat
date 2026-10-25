import { MODEL_CATALOG, MODEL_CATALOG_HASH, MODEL_CATALOG_VERSION } from '@nebula-chat/contracts';

export const modelService = {
  getCatalog() {
    return {
      version: MODEL_CATALOG_VERSION,
      hash: MODEL_CATALOG_HASH,
      models: [...MODEL_CATALOG],
    };
  },
};
